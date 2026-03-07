"""Request audit middleware — logs every API call for SOC 2 compliance."""

import time
import logging

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logger = logging.getLogger("audit")


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000, 1)

        # Log every request for SOC 2 audit trail
        logger.info(
            f"{request.method} {request.url.path} "
            f"status={response.status_code} "
            f"duration={duration_ms}ms "
            f"client={request.client.host if request.client else 'unknown'}"
        )

        response.headers["X-Request-Duration-Ms"] = str(duration_ms)
        return response
