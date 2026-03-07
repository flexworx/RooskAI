"""Webhook delivery service — fires registered webhooks when platform events occur."""

import hashlib
import hmac
import json
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import MurphAgent
from app.services.audit import log_action

logger = logging.getLogger(__name__)
settings = get_settings()


def _sign_payload(payload: bytes, secret: str) -> str:
    """Generate HMAC-SHA256 signature for webhook payload."""
    return hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()


async def fire_webhook(
    event_type: str,
    payload: dict,
    db: AsyncSession,
) -> list[dict]:
    """Fire webhook to all agents subscribed to the given event type.

    Args:
        event_type: One of vm.created, vm.deleted, alert.triggered,
                    backup.completed, security.violation, agent.heartbeat.missed
        payload: Event data to send
        db: Database session

    Returns:
        List of delivery results: [{agent_id, status, http_code, error}]
    """
    result = await db.execute(select(MurphAgent).where(MurphAgent.webhook_url.isnot(None)))
    agents = list(result.scalars().all())

    delivery_results = []

    for agent in agents:
        subscribed = agent.subscribed_events or []
        if event_type not in subscribed:
            continue

        if not agent.webhook_url:
            continue

        webhook_body = {
            "event_type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        body_bytes = json.dumps(webhook_body, default=str).encode()
        signature = _sign_payload(body_bytes, settings.MURPH_WEBHOOK_SECRET)

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    agent.webhook_url,
                    content=body_bytes,
                    headers={
                        "Content-Type": "application/json",
                        "X-Webhook-Signature": signature,
                        "X-Event-Type": event_type,
                    },
                )

            delivery_result = {
                "agent_id": agent.agent_id,
                "status": "delivered" if resp.status_code < 400 else "failed",
                "http_code": resp.status_code,
                "error": None,
            }

        except Exception as e:
            logger.warning(
                f"Webhook delivery failed for agent {agent.agent_id} "
                f"at {agent.webhook_url}: {e}"
            )
            delivery_result = {
                "agent_id": agent.agent_id,
                "status": "failed",
                "http_code": None,
                "error": str(e),
            }

        delivery_results.append(delivery_result)

        await log_action(
            db,
            action=f"webhook.deliver.{event_type}",
            resource_type="webhook",
            agent_id=agent.agent_id,
            parameters={
                "callback_url": agent.webhook_url,
                "event_type": event_type,
                "http_code": delivery_result.get("http_code"),
            },
            outcome=delivery_result["status"],
        )

    return delivery_results
