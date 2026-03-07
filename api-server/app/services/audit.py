"""Audit logging service — every platform action is logged."""

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import AuditLog

logger = logging.getLogger(__name__)


async def log_action(
    db: AsyncSession,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    user_id: UUID | None = None,
    agent_id: str | None = None,
    parameters: dict | None = None,
    outcome: str = "success",
    rollback_plan: str | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    """Create an audit log entry. Every action must be logged per SOC 2 CC PI1.1."""
    entry = AuditLog(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        user_id=user_id,
        agent_id=agent_id,
        parameters=parameters,
        outcome=outcome,
        rollback_plan=rollback_plan,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.flush()
    logger.info(
        f"AUDIT: {action} | resource={resource_type}:{resource_id} | "
        f"user={user_id} | agent={agent_id} | outcome={outcome}"
    )
    return entry


async def get_logs(
    db: AsyncSession,
    agent_id: str | None = None,
    from_ts: datetime | None = None,
    to_ts: datetime | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[AuditLog]:
    """Fetch audit log entries with optional filtering."""
    query = select(AuditLog).order_by(desc(AuditLog.timestamp))

    if agent_id:
        query = query.where(AuditLog.agent_id == agent_id)
    if from_ts:
        query = query.where(AuditLog.timestamp >= from_ts)
    if to_ts:
        query = query.where(AuditLog.timestamp <= to_ts)

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return list(result.scalars().all())
