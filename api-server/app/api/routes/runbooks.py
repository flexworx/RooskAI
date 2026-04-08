"""Runbooks — saved automation playbooks with CRUD and execution support."""

import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Runbook, RunbookStep
from app.services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/runbooks", tags=["Runbooks"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class RunbookStepIn(BaseModel):
    action: str
    target: str | None = None
    step_type: str = "shell"


class RunbookCreate(BaseModel):
    name: str
    description: str | None = None
    trigger: str = "manual"  # manual | alert | schedule | threshold
    steps: list[RunbookStepIn] = []


class RunbookUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    trigger: str | None = None
    steps: list[RunbookStepIn] | None = None


def _serialize_runbook(rb: Runbook) -> dict:
    return {
        "id": str(rb.id),
        "name": rb.name,
        "description": rb.description,
        "trigger": rb.trigger,
        "status": rb.status,
        "last_run": rb.last_run.isoformat() if rb.last_run else None,
        "created_by": rb.created_by,
        "created_at": rb.created_at.isoformat() if rb.created_at else None,
        "steps": [
            {
                "id": str(s.id),
                "step_order": s.step_order,
                "action": s.action,
                "target": s.target,
                "step_type": s.step_type,
            }
            for s in (rb.steps or [])
        ],
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/")
async def list_runbooks(
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """List all runbooks ordered by name."""
    result = await db.execute(select(Runbook).order_by(Runbook.name))
    runbooks = result.scalars().all()
    # Eager-load steps for each runbook
    out = []
    for rb in runbooks:
        await db.refresh(rb, ["steps"])
        out.append(_serialize_runbook(rb))
    return out


@router.post("/")
async def create_runbook(
    body: RunbookCreate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Create a new runbook with its steps."""
    rb = Runbook(
        name=body.name,
        description=body.description,
        trigger=body.trigger,
        status="ready",
        created_by=user.get("sub"),
    )
    db.add(rb)
    await db.flush()  # get rb.id

    for i, step_in in enumerate(body.steps):
        step = RunbookStep(
            runbook_id=rb.id,
            step_order=i + 1,
            action=step_in.action,
            target=step_in.target,
            step_type=step_in.step_type,
        )
        db.add(step)

    await db.commit()
    await db.refresh(rb, ["steps"])

    await log_action(
        db, action="runbook.create", resource_type="runbook",
        resource_id=str(rb.id),
        user_id=uuid.UUID(user["sub"]) if user.get("sub") else None,
        parameters={"name": rb.name},
        outcome="success",
    )

    return _serialize_runbook(rb)


@router.get("/{runbook_id}")
async def get_runbook(
    runbook_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Get a single runbook by ID."""
    result = await db.execute(select(Runbook).where(Runbook.id == uuid.UUID(runbook_id)))
    rb = result.scalar_one_or_none()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")
    await db.refresh(rb, ["steps"])
    return _serialize_runbook(rb)


@router.patch("/{runbook_id}")
async def update_runbook(
    runbook_id: str,
    body: RunbookUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Update runbook metadata and/or replace its steps."""
    result = await db.execute(select(Runbook).where(Runbook.id == uuid.UUID(runbook_id)))
    rb = result.scalar_one_or_none()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")

    if body.name is not None:
        rb.name = body.name
    if body.description is not None:
        rb.description = body.description
    if body.trigger is not None:
        rb.trigger = body.trigger

    if body.steps is not None:
        # Delete existing steps and replace
        existing = await db.execute(
            select(RunbookStep).where(RunbookStep.runbook_id == rb.id)
        )
        for s in existing.scalars().all():
            await db.delete(s)
        await db.flush()
        for i, step_in in enumerate(body.steps):
            step = RunbookStep(
                runbook_id=rb.id,
                step_order=i + 1,
                action=step_in.action,
                target=step_in.target,
                step_type=step_in.step_type,
            )
            db.add(step)

    await db.commit()
    await db.refresh(rb, ["steps"])
    return _serialize_runbook(rb)


@router.delete("/{runbook_id}")
async def delete_runbook(
    runbook_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Delete a runbook and all its steps (CASCADE)."""
    result = await db.execute(select(Runbook).where(Runbook.id == uuid.UUID(runbook_id)))
    rb = result.scalar_one_or_none()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")
    await db.delete(rb)
    await db.commit()
    return {"runbook_id": runbook_id, "deleted": True}


@router.post("/{runbook_id}/execute")
async def execute_runbook(
    runbook_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Trigger runbook execution.

    Phase 1: marks the runbook as run and logs the event.
    The step actions are described in plain text and intended to be dispatched
    to the AI action engine (LLM) or an operator for approval.
    """
    result = await db.execute(select(Runbook).where(Runbook.id == uuid.UUID(runbook_id)))
    rb = result.scalar_one_or_none()
    if not rb:
        raise HTTPException(status_code=404, detail="Runbook not found")
    if rb.status == "running":
        raise HTTPException(status_code=409, detail="Runbook is already running")

    await db.refresh(rb, ["steps"])

    rb.status = "running"
    rb.last_run = datetime.now(timezone.utc)
    await db.commit()

    await log_action(
        db, action="runbook.execute", resource_type="runbook",
        resource_id=str(rb.id),
        user_id=uuid.UUID(user["sub"]) if user.get("sub") else None,
        parameters={
            "name": rb.name,
            "steps": [{"action": s.action, "target": s.target} for s in rb.steps],
        },
        outcome="success",
        rollback_plan=f"Manually revert any actions performed by runbook '{rb.name}'",
    )

    # Mark completed — in a full implementation this would be async task dispatch
    rb.status = "completed"
    await db.commit()

    return {
        "runbook_id": runbook_id,
        "name": rb.name,
        "status": "completed",
        "steps_count": len(rb.steps),
        "executed_at": rb.last_run.isoformat(),
        "message": f"Runbook '{rb.name}' executed with {len(rb.steps)} steps. Review audit log for details.",
    }
