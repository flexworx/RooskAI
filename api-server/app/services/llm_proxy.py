"""LLM Proxy Service — Bedrock + Ollama dual-backend.

AI requests route through data sanitization then to the selected backend.
Bedrock (AWS Claude) is the primary backend. Ollama is the secondary backend
enabled when OLLAMA_ENABLED=true in config (requires GPU).
The force_backend parameter allows explicit backend selection per request.
"""

import json
import re
import time
import logging
from typing import Any

import boto3
import httpx
from botocore.exceptions import ClientError

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# RFC1918 private IP regex
_PRIVATE_IP_RE = re.compile(
    r"\b("
    r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
    r"172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|"
    r"192\.168\.\d{1,3}\.\d{1,3}"
    r")\b"
)

# Sensitive keywords that trigger request rejection
_SENSITIVE_KEYWORDS = re.compile(
    r"\b(password|secret|token|credential|api[_-]?key|private[_-]?key)\b",
    re.IGNORECASE,
)

# Internal VM hostname pattern
_VM_HOSTNAME_RE = re.compile(r"\bVM-[A-Z]+-\d+\b", re.IGNORECASE)

# Internal file paths
_INTERNAL_PATH_RE = re.compile(r"(/etc/|/var/|/root/|/home/)\S+")


class SanitizationResult:
    def __init__(self, text: str, actions: list[str], rejected: bool = False):
        self.text = text
        self.actions = actions
        self.rejected = rejected


def sanitize_request(text: str) -> SanitizationResult:
    """Strip or mask sensitive data before sending to Bedrock.

    Per Addendum v1.1 sanitization rules:
    - RFC1918 IPs → [INTERNAL-IP]
    - Sensitive keywords → reject request
    - VM hostnames → [VM-NAME]
    - Internal paths → stripped
    """
    actions: list[str] = []
    rejected = False

    # Check for sensitive keywords — reject entirely
    if _SENSITIVE_KEYWORDS.search(text):
        actions.append("REJECTED: sensitive keyword detected")
        return SanitizationResult(text="", actions=actions, rejected=True)

    # Replace private IPs
    sanitized, ip_count = _PRIVATE_IP_RE.subn("[INTERNAL-IP]", text)
    if ip_count > 0:
        actions.append(f"replaced {ip_count} internal IP(s)")

    # Replace VM hostnames
    sanitized, vm_count = _VM_HOSTNAME_RE.subn("[VM-NAME]", sanitized)
    if vm_count > 0:
        actions.append(f"replaced {vm_count} VM hostname(s)")

    # Strip internal paths
    sanitized, path_count = _INTERNAL_PATH_RE.subn("[PATH-REDACTED]", sanitized)
    if path_count > 0:
        actions.append(f"redacted {path_count} internal path(s)")

    return SanitizationResult(text=sanitized, actions=actions)


class LLMProxy:
    """Dual-backend AI proxy — routes to Bedrock (primary) or Ollama (local GPU)."""

    def __init__(self):
        self._bedrock_client = None
        self._stats = {
            "total_requests": 0,
            "bedrock_requests": 0,
            "ollama_requests": 0,
            "total_latency_ms": 0,
            "total_cost_usd": 0.0,
        }

    @property
    def bedrock_client(self):
        if self._bedrock_client is None:
            self._bedrock_client = boto3.client(
                "bedrock-runtime",
                region_name=settings.AWS_REGION,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
            )
        return self._bedrock_client

    def _resolve_backend(self, force_backend: str | None) -> str:
        """Determine which backend to use for a request."""
        if force_backend == "ollama" and settings.OLLAMA_ENABLED:
            return "ollama"
        if force_backend == "bedrock":
            return "bedrock"
        # Default: use Ollama if enabled and Bedrock is not configured
        if settings.OLLAMA_ENABLED and not settings.AWS_ACCESS_KEY_ID:
            return "ollama"
        return "bedrock"

    async def complete(
        self,
        prompt: str,
        context: dict | None = None,
        force_backend: str | None = None,
        system_prompt: str | None = None,
        conversation_history: list[dict] | None = None,
    ) -> dict[str, Any]:
        """Route request through sanitization → selected backend → response."""
        # Sanitize
        result = sanitize_request(prompt)
        if result.rejected:
            return {
                "response": "Request rejected: contains sensitive data that cannot be sent to cloud AI. "
                "Remove credentials, secrets, or tokens and retry.",
                "backend": "none",
                "model": "none",
                "latency_ms": 0,
                "sanitized": True,
                "sanitization_actions": result.actions,
            }

        # Build prompt with context
        sanitized_prompt = result.text
        if context:
            context_str = json.dumps(context, default=str)
            sanitized_prompt = f"Context: {context_str}\n\nRequest: {sanitized_prompt}"

        default_system = (
            "You are the AI assistant for the Murph.AI NexGen Server "
            "Orchestration Platform. You help manage infrastructure on a "
            "Dell PowerEdge R7625 running Proxmox VE 9.1. Respond with "
            "structured, actionable plans. For destructive actions, always "
            "flag APPROVAL REQUIRED."
        )

        backend = self._resolve_backend(force_backend)

        if backend == "ollama":
            return await self._complete_ollama(
                sanitized_prompt, system_prompt or default_system, result,
                conversation_history=conversation_history,
            )
        return await self._complete_bedrock(
            sanitized_prompt, system_prompt or default_system, result,
            conversation_history=conversation_history,
        )

    async def _complete_ollama(
        self,
        prompt: str,
        system_prompt: str,
        sanitization: SanitizationResult,
        conversation_history: list[dict] | None = None,
    ) -> dict[str, Any]:
        """Send completion request to local Ollama instance."""
        start = time.monotonic()
        try:
            # Build full prompt with conversation history
            full_prompt = prompt
            if conversation_history:
                history_text = "\n".join(
                    f"{msg['role'].upper()}: {msg['content']}"
                    for msg in conversation_history
                )
                full_prompt = f"{history_text}\nUSER: {prompt}"

            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    f"{settings.OLLAMA_ENDPOINT}/api/generate",
                    json={
                        "model": settings.OLLAMA_MODEL,
                        "prompt": full_prompt,
                        "system": system_prompt,
                        "stream": False,
                    },
                )
                resp.raise_for_status()
                body = resp.json()

            latency_ms = int((time.monotonic() - start) * 1000)
            response_text = body.get("response", "")

            self._stats["total_requests"] += 1
            self._stats["ollama_requests"] += 1
            self._stats["total_latency_ms"] += latency_ms

            return {
                "response": response_text,
                "backend": "ollama",
                "model": settings.OLLAMA_MODEL,
                "latency_ms": latency_ms,
                "sanitized": len(sanitization.actions) > 0,
                "sanitization_actions": sanitization.actions,
                "tokens": {
                    "input": body.get("prompt_eval_count", 0),
                    "output": body.get("eval_count", 0),
                },
                "cost_usd": 0.0,
            }

        except Exception as e:
            latency_ms = int((time.monotonic() - start) * 1000)
            logger.error(f"Ollama API error: {e}")
            # Fall back to Bedrock if Ollama fails
            if settings.AWS_ACCESS_KEY_ID:
                logger.info("Falling back to Bedrock after Ollama failure")
                return await self._complete_bedrock(
                    prompt, system_prompt, sanitization,
                    conversation_history=conversation_history,
                )
            return {
                "response": f"Ollama API error: {e}",
                "backend": "ollama",
                "model": settings.OLLAMA_MODEL,
                "latency_ms": latency_ms,
                "sanitized": len(sanitization.actions) > 0,
                "sanitization_actions": sanitization.actions,
                "error": True,
            }

    async def _complete_bedrock(
        self,
        prompt: str,
        system_prompt: str,
        sanitization: SanitizationResult,
        conversation_history: list[dict] | None = None,
    ) -> dict[str, Any]:
        """Send completion request to AWS Bedrock with optional conversation history."""
        start = time.monotonic()

        try:
            # Build messages array with conversation history
            messages: list[dict] = []
            if conversation_history:
                for msg in conversation_history:
                    role = msg.get("role", "user")
                    # Bedrock only accepts "user" and "assistant" roles
                    if role in ("user", "assistant"):
                        messages.append({"role": role, "content": msg["content"]})
            messages.append({"role": "user", "content": prompt})

            response = self.bedrock_client.invoke_model(
                modelId=settings.BEDROCK_MODEL_ID,
                contentType="application/json",
                accept="application/json",
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 4096,
                    "messages": messages,
                    "system": system_prompt,
                }),
            )

            latency_ms = int((time.monotonic() - start) * 1000)
            body = json.loads(response["body"].read())
            response_text = body["content"][0]["text"]

            # Estimate cost (Claude Sonnet pricing approximate)
            input_tokens = body.get("usage", {}).get("input_tokens", 0)
            output_tokens = body.get("usage", {}).get("output_tokens", 0)
            cost = (input_tokens * 0.003 + output_tokens * 0.015) / 1000

            # Track stats
            self._stats["total_requests"] += 1
            self._stats["bedrock_requests"] += 1
            self._stats["total_latency_ms"] += latency_ms
            self._stats["total_cost_usd"] += cost

            return {
                "response": response_text,
                "backend": "bedrock",
                "model": settings.BEDROCK_MODEL_ID,
                "latency_ms": latency_ms,
                "sanitized": len(sanitization.actions) > 0,
                "sanitization_actions": sanitization.actions,
                "tokens": {"input": input_tokens, "output": output_tokens},
                "cost_usd": round(cost, 6),
            }

        except ClientError as e:
            latency_ms = int((time.monotonic() - start) * 1000)
            logger.error(f"Bedrock API error: {e}")
            return {
                "response": f"Bedrock API error: {e.response['Error']['Message']}",
                "backend": "bedrock",
                "model": settings.BEDROCK_MODEL_ID,
                "latency_ms": latency_ms,
                "sanitized": len(sanitization.actions) > 0,
                "sanitization_actions": sanitization.actions,
                "error": True,
            }

    async def health(self) -> dict:
        """Check backend connectivity for Bedrock and Ollama."""
        bedrock_status = {"name": "bedrock", "status": "unknown", "latency_ms": None}
        ollama_status = {
            "name": "ollama",
            "status": "disabled" if not settings.OLLAMA_ENABLED else "unknown",
            "latency_ms": None,
        }

        # Check Bedrock
        try:
            start = time.monotonic()
            self.bedrock_client.invoke_model(
                modelId=settings.BEDROCK_MODEL_ID,
                contentType="application/json",
                accept="application/json",
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": "ping"}],
                }),
            )
            bedrock_status["status"] = "healthy"
            bedrock_status["latency_ms"] = round((time.monotonic() - start) * 1000, 1)
        except Exception as e:
            bedrock_status["status"] = "unhealthy"
            logger.warning(f"Bedrock health check failed: {e}")

        # Check Ollama if enabled
        if settings.OLLAMA_ENABLED:
            try:
                start = time.monotonic()
                async with httpx.AsyncClient(timeout=5.0) as client:
                    resp = await client.get(f"{settings.OLLAMA_ENDPOINT}/api/tags")
                    resp.raise_for_status()
                ollama_status["status"] = "healthy"
                ollama_status["latency_ms"] = round((time.monotonic() - start) * 1000, 1)
            except Exception as e:
                ollama_status["status"] = "unhealthy"
                logger.warning(f"Ollama health check failed: {e}")

        return {"bedrock": bedrock_status, "ollama": ollama_status}

    def stats(self) -> dict:
        total = self._stats["total_requests"]
        return {
            "total_requests": total,
            "bedrock_requests": self._stats["bedrock_requests"],
            "ollama_requests": self._stats["ollama_requests"],
            "avg_latency_ms": round(
                self._stats["total_latency_ms"] / total if total > 0 else 0, 1
            ),
            "estimated_cost_usd": round(self._stats["total_cost_usd"], 4),
        }


# Singleton
llm_proxy = LLMProxy()
