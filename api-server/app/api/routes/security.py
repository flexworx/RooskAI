"""Security management endpoints — alerts, scanning, compliance."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import SecurityAlert
from app.api.schemas.schemas import SecurityAlertResponse
from app.services.audit import log_action

router = APIRouter(prefix="/security", tags=["Security"])


@router.get("/alerts", response_model=list[SecurityAlertResponse])
async def list_alerts(
    resolved: bool = False,
    severity: str | None = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List security alerts — filtered by resolution status and severity."""
    query = (
        select(SecurityAlert)
        .where(SecurityAlert.resolved == resolved)
        .order_by(desc(SecurityAlert.created_at))
        .limit(limit)
    )
    if severity:
        query = query.where(SecurityAlert.severity == severity)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("operator")),
):
    """Mark a security alert as resolved."""
    from datetime import datetime, timezone

    result = await db.execute(
        select(SecurityAlert).where(SecurityAlert.id == alert_id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.resolved = True
    alert.resolved_by = user.get("sub", "unknown")
    alert.resolved_at = datetime.now(timezone.utc)

    await log_action(
        db,
        action="security.alert.resolve",
        resource_type="security_alert",
        resource_id=str(alert_id),
        user_id=UUID(user["sub"]) if "sub" in user else None,
        outcome="success",
    )

    return {"status": "resolved", "alert_id": str(alert_id)}
