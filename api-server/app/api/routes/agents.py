"""Murph.ai Agent management endpoints — list, register, heartbeat, types, actions."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import MurphAgent, MurphCommand
from app.services.audit import log_action
from app.services.agent_types import list_agent_types, get_agent_type

router = APIRouter(prefix="/agents", tags=["Agents"])


class AgentStatusUpdate(BaseModel):
    status: str  # "active" | "inactive"


class AgentCommandRequest(BaseModel):
    command: str
    parameters: dict | None = None


@router.get("/types")
async def get_agent_types(user: dict = Depends(get_current_user)):
    """List all available agent types with capabilities."""
    return list_agent_types()


@router.get("/")
async def list_agents(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List all registered Murph.ai agents with heartbeat status."""
    result = await db.execute(
        select(MurphAgent).order_by(MurphAgent.registered_at)
    )
    agents = list(result.scalars().all())

    now = datetime.now(timezone.utc)
    agent_list = []
    for agent in agents:
        last_hb = agent.last_heartbeat
        if last_hb and (now - last_hb).total_seconds() > 120:
            agent.missed_heartbeats = max(
                agent.missed_heartbeats,
                int((now - last_hb).total_seconds() // 60),
            )
            if agent.missed_heartbeats > 5:
                agent.status = "critical"
            elif agent.missed_heartbeats > 2:
                agent.status = "warning"

        agent_list.append({
            "agent_id": agent.agent_id,
            "name": agent.name,
            "status": agent.status,
            "agent_type": agent.agent_type or "generic",
            "capabilities": agent.capabilities or [],
            "description": agent.description or "",
            "version": agent.version or "",
            "last_heartbeat": agent.last_heartbeat.isoformat() if agent.last_heartbeat else None,
            "missed_heartbeats": agent.missed_heartbeats,
            "registered_at": agent.registered_at.isoformat() if agent.registered_at else None,
            "webhook_url": agent.webhook_url,
            "subscribed_events": agent.subscribed_events,
        })

    # Persist heartbeat status mutations to database
    await db.commit()

    return agent_list


@router.get("/{agent_id}")
async def get_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get details for a specific agent including recent commands."""
    result = await db.execute(
        select(MurphAgent).where(MurphAgent.agent_id == agent_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    cmd_result = await db.execute(
        select(MurphCommand)
        .where(MurphCommand.agent_id == agent_id)
        .order_by(MurphCommand.created_at.desc())
        .limit(20)
    )
    commands = list(cmd_result.scalars().all())

    return {
        "agent_id": agent.agent_id,
        "name": agent.name,
        "status": agent.status,
        "agent_type": agent.agent_type or "generic",
        "capabilities": agent.capabilities or [],
        "description": agent.description or "",
        "version": agent.version or "",
        "last_heartbeat": agent.last_heartbeat.isoformat() if agent.last_heartbeat else None,
        "missed_heartbeats": agent.missed_heartbeats,
        "registered_at": agent.registered_at.isoformat() if agent.registered_at else None,
        "webhook_url": agent.webhook_url,
        "subscribed_events": agent.subscribed_events,
        "recent_commands": [
            {
                "job_id": cmd.job_id,
                "command": cmd.command,
                "status": cmd.status,
                "progress": cmd.progress,
                "created_at": cmd.created_at.isoformat() if cmd.created_at else None,
            }
            for cmd in commands
        ],
    }


@router.delete("/{agent_id}")
async def deregister_agent(
    agent_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Remove a registered agent."""
    result = await db.execute(
        select(MurphAgent).where(MurphAgent.agent_id == agent_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    await db.delete(agent)
    await log_action(
        db,
        action="agent.deregister",
        resource_type="murph_agent",
        resource_id=agent_id,
        outcome="success",
    )

    return {"status": "deregistered", "agent_id": agent_id}


@router.patch("/{agent_id}/status")
async def update_agent_status(
    agent_id: str,
    body: AgentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Activate or deactivate an agent."""
    if body.status not in ("active", "inactive"):
        raise HTTPException(status_code=400, detail="Status must be 'active' or 'inactive'")

    result = await db.execute(
        select(MurphAgent).where(MurphAgent.agent_id == agent_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    agent.status = body.status
    if body.status == "active":
        agent.last_heartbeat = datetime.now(timezone.utc)
        agent.missed_heartbeats = 0
    await db.commit()

    await log_action(
        db,
        action=f"agent.{body.status}",
        resource_type="murph_agent",
        resource_id=agent_id,
        outcome="success",
    )

    return {"agent_id": agent_id, "status": agent.status}


@router.post("/{agent_id}/command")
async def dispatch_command(
    agent_id: str,
    body: AgentCommandRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Dispatch a command to an agent."""
    result = await db.execute(
        select(MurphAgent).where(MurphAgent.agent_id == agent_id)
    )
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if agent.status != "active":
        raise HTTPException(status_code=409, detail="Agent is not active")

    job_id = f"cmd-{uuid.uuid4().hex[:12]}"
    cmd = MurphCommand(
        job_id=job_id,
        agent_id=agent_id,
        command=body.command,
        parameters=body.parameters or {},
        status="queued",
        progress=0,
    )
    db.add(cmd)

    await log_action(
        db,
        action="agent.command",
        resource_type="murph_command",
        resource_id=job_id,
        outcome="pending",
        parameters={"command": body.command, "agent_id": agent_id},
    )

    return {
        "job_id": job_id,
        "agent_id": agent_id,
        "command": body.command,
        "status": "queued",
    }
