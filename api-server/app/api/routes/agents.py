"""Murph.ai Agent management endpoints — list, register, heartbeat, types."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import MurphAgent, MurphCommand
from app.services.audit import log_action
from app.services.agent_types import list_agent_types, get_agent_type

router = APIRouter(prefix="/agents", tags=["Agents"])


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
