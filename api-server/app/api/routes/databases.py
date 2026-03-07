"""Database management endpoints — PostgreSQL + MySQL lifecycle."""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.models import DatabaseInstance
from app.api.schemas.schemas import DatabaseInstanceResponse
from app.services.audit import log_action
from app.services.backup import run_pg_backup

router = APIRouter(prefix="/databases", tags=["Databases"])


@router.get("/", response_model=list[DatabaseInstanceResponse])
async def list_databases(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all managed database instances."""
    result = await db.execute(
        select(DatabaseInstance).order_by(DatabaseInstance.name)
    )
    return list(result.scalars().all())


@router.get("/{db_id}", response_model=DatabaseInstanceResponse)
async def get_database(
    db_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(DatabaseInstance).where(DatabaseInstance.id == db_id)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Database instance not found")
    return instance


@router.post("/{db_id}/backup")
async def trigger_backup(
    db_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(require_role("operator")),
):
    """Trigger an immediate backup of a database instance via pg_dump over SSH."""
    result = await db.execute(
        select(DatabaseInstance).where(DatabaseInstance.id == db_id)
    )
    instance = result.scalar_one_or_none()
    if not instance:
        raise HTTPException(status_code=404, detail="Database instance not found")

    if not instance.host:
        raise HTTPException(
            status_code=400,
            detail="Database instance has no host configured — cannot run backup",
        )

    backup_result = await run_pg_backup(
        host=instance.host,
        port=instance.port or 5432,
        database=instance.name,
    )

    if backup_result["success"]:
        instance.last_backup = datetime.now(timezone.utc)
        outcome = "success"
    else:
        outcome = "failure"

    await log_action(
        db,
        action="db.backup.trigger",
        resource_type="database",
        resource_id=str(db_id),
        user_id=UUID(user["sub"]) if "sub" in user else None,
        parameters={
            "database": instance.name,
            "engine": instance.engine,
            "backup_path": backup_result.get("backup_path"),
            "size_bytes": backup_result.get("size_bytes"),
            "duration_seconds": backup_result.get("duration_seconds"),
        },
        outcome=outcome,
        rollback_plan="N/A — backup is non-destructive",
    )

    return {
        "status": "backup_completed" if backup_result["success"] else "backup_failed",
        "database": instance.name,
        "engine": instance.engine,
        "backup_path": backup_result.get("backup_path"),
        "size_bytes": backup_result.get("size_bytes"),
        "duration_seconds": backup_result.get("duration_seconds"),
        "error": backup_result.get("error"),
    }
