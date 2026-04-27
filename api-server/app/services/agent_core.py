"""AgentCore — Platform-managed agent lifecycle and heartbeat service.

The 7 built-in Roosk agents (Murph General, Infra, Security, Database,
Network, DaaS, Monitoring) are logical AI capabilities that run as part
of the platform itself, not as separate external processes.

AgentCore manages their lifecycle:
- Refreshes heartbeats every HEARTBEAT_INTERVAL_SECONDS on startup
- Ensures agents are always seeded and up-to-date with agent_types definitions
- Provides health status aggregation for the dashboard
- Handles agent capability updates when agent_types definitions change

This service is started as a background task in main.py lifespan.
"""

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.models.models import MurphAgent
from app.services.agent_types import get_default_agents, AGENT_TYPES

logger = logging.getLogger(__name__)

# How often to refresh platform agent heartbeats (seconds)
HEARTBEAT_INTERVAL_SECONDS = 60

# Platform-managed agent IDs (built-in, not external processes)
PLATFORM_AGENT_IDS = {f"murph-{type_id}" for type_id in AGENT_TYPES}

_running = False
_task: asyncio.Task | None = None


async def _refresh_platform_agents():
    """Refresh heartbeats for all platform-managed agents."""
    async with async_session() as session:
        try:
            result = await session.execute(
                select(MurphAgent).where(MurphAgent.agent_id.in_(PLATFORM_AGENT_IDS))
            )
            agents = list(result.scalars().all())
            now = datetime.now(timezone.utc)

            # Build a map of existing agents
            existing_ids = {a.agent_id for a in agents}

            # Update heartbeat for existing platform agents
            for agent in agents:
                agent.last_heartbeat = now
                agent.missed_heartbeats = 0
                agent.status = "active"

            # Seed any missing platform agents (e.g., after new agent type added)
            for agent_data in get_default_agents():
                if agent_data["agent_id"] not in existing_ids:
                    new_agent = MurphAgent(
                        agent_id=agent_data["agent_id"],
                        name=agent_data["name"],
                        status="active",
                        agent_type=agent_data["agent_type"],
                        capabilities=agent_data["capabilities"],
                        description=agent_data["description"],
                        version=agent_data["version"],
                        last_heartbeat=now,
                        missed_heartbeats=0,
                    )
                    session.add(new_agent)
                    logger.info(f"AgentCore: seeded new platform agent {agent_data['agent_id']}")

            # Update capabilities/description if agent_types definition changed
            agent_map = {a.agent_id: a for a in agents}
            for agent_data in get_default_agents():
                agent = agent_map.get(agent_data["agent_id"])
                if agent:
                    # Sync capabilities and description from agent_types definition
                    if agent.capabilities != agent_data["capabilities"]:
                        agent.capabilities = agent_data["capabilities"]
                    if agent.description != agent_data["description"]:
                        agent.description = agent_data["description"]

            await session.commit()
            logger.debug(f"AgentCore: refreshed heartbeat for {len(agents)} platform agents")

        except Exception as e:
            logger.error(f"AgentCore: heartbeat refresh failed: {e}")
            await session.rollback()


async def _heartbeat_loop():
    """Background loop that refreshes platform agent heartbeats."""
    global _running
    logger.info("AgentCore: heartbeat loop started")

    while _running:
        try:
            await _refresh_platform_agents()
        except Exception as e:
            logger.error(f"AgentCore: unexpected error in heartbeat loop: {e}")

        await asyncio.sleep(HEARTBEAT_INTERVAL_SECONDS)

    logger.info("AgentCore: heartbeat loop stopped")


async def start():
    """Start the AgentCore background heartbeat service."""
    global _running, _task

    if _running:
        logger.warning("AgentCore: already running")
        return

    _running = True

    # Do an immediate refresh on startup to fix any stale heartbeats
    await _refresh_platform_agents()
    logger.info("AgentCore: initial heartbeat refresh complete")

    # Start the background loop
    _task = asyncio.create_task(_heartbeat_loop())
    logger.info("AgentCore: background heartbeat task started")


async def stop():
    """Stop the AgentCore background heartbeat service."""
    global _running, _task

    _running = False

    if _task and not _task.done():
        _task.cancel()
        try:
            await _task
        except asyncio.CancelledError:
            pass

    logger.info("AgentCore: stopped")


def get_platform_agent_ids() -> set[str]:
    """Return the set of platform-managed agent IDs."""
    return PLATFORM_AGENT_IDS.copy()
