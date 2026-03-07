"""Platform health and system status endpoints."""

import time

from fastapi import APIRouter

from app.core.config import get_settings
from app.api.schemas.schemas import HealthResponse, ServiceHealth
from app.services.proxmox import proxmox_client
from app.services.llm_proxy import llm_proxy

router = APIRouter(tags=["Health"])
settings = get_settings()

_start_time = time.monotonic()


@router.get("/health", response_model=HealthResponse)
async def platform_health():
    """Platform health check — used by Murph.ai heartbeat and monitoring."""
    uptime = time.monotonic() - _start_time

    # Check each critical service
    services = []

    # Proxmox
    px_health = await proxmox_client.health_check()
    services.append(ServiceHealth(
        name="proxmox",
        status=px_health.get("status", "unknown"),
        latency_ms=None,
    ))

    # Bedrock LLM
    llm_health = await llm_proxy.health()
    services.append(ServiceHealth(
        name="bedrock",
        status=llm_health["bedrock"]["status"],
        latency_ms=llm_health["bedrock"].get("latency_ms"),
    ))
    services.append(ServiceHealth(
        name="ollama",
        status=llm_health["ollama"]["status"],
        latency_ms=None,
    ))

    # Determine overall status
    critical_down = any(
        s.status == "unhealthy"
        for s in services
        if s.name in ("proxmox", "bedrock")
    )
    overall = "degraded" if critical_down else "healthy"

    return HealthResponse(
        status=overall,
        version=settings.APP_VERSION,
        uptime_seconds=round(uptime, 1),
        services=[s.model_dump() for s in services],
    )
