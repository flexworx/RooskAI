"""Murph.ai Integration API — all 6 endpoints per Master Build Prompt Section 2.2.6."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_hmac_signature, get_current_user
from app.models.models import (
    MurphAgent, MurphCommand, SecurityAlert, DatabaseInstance, VirtualMachine,
)
from app.api.schemas.schemas import (
    MurphEvent, MurphEventResponse,
    MurphStatusResponse, MurphCommandRequest, MurphCommandResponse,
    MurphCommandStatus, MurphWebhookRegister, MurphLogEntry,
    ServiceHealth,
)
from app.services.proxmox import proxmox_client
from app.services.llm_proxy import llm_proxy
from app.services.audit import log_action, get_logs
from app.services.backup import run_pg_backup

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/murph", tags=["Murph.ai Integration"])

# Approved command whitelist — only these commands can be executed via agent
APPROVED_COMMANDS = {
    "vm.status", "vm.start", "vm.stop", "vm.restart", "vm.snapshot",
    "db.status", "db.backup",
    "security.scan", "security.alert.list",
    "platform.health", "platform.metrics",
    "llm.complete",
}

# Destructive commands that require human approval token
DESTRUCTIVE_COMMANDS = {"vm.stop", "vm.delete", "db.drop"}


async def _execute_command(command: str, parameters: dict, db: AsyncSession) -> dict:
    """Execute an approved command by routing to the appropriate platform service."""
    if command == "vm.status":
        vmid = parameters.get("vmid")
        if vmid:
            data = await proxmox_client.get_vm_status(int(vmid))
            return {"vm_status": data}
        vms = await proxmox_client.list_vms()
        return {"vms": vms, "count": len(vms)}

    elif command == "vm.start":
        vmid = int(parameters["vmid"])
        data = await proxmox_client.start_vm(vmid)
        return {"action": "start", "vmid": vmid, "result": data}

    elif command == "vm.stop":
        vmid = int(parameters["vmid"])
        data = await proxmox_client.stop_vm(vmid)
        return {"action": "stop", "vmid": vmid, "result": data}

    elif command == "vm.restart":
        vmid = int(parameters["vmid"])
        data = await proxmox_client.restart_vm(vmid)
        return {"action": "restart", "vmid": vmid, "result": data}

    elif command == "vm.snapshot":
        vmid = int(parameters["vmid"])
        name = parameters.get("name", f"snap-{vmid}-agent")
        desc = parameters.get("description", "Created by Murph.ai agent")
        data = await proxmox_client.create_snapshot(vmid, name, desc)
        return {"action": "snapshot", "vmid": vmid, "name": name, "result": data}

    elif command == "db.status":
        result = await db.execute(select(DatabaseInstance))
        instances = list(result.scalars().all())
        return {
            "databases": [
                {"name": i.name, "engine": i.engine, "status": i.status, "role": i.role}
                for i in instances
            ]
        }

    elif command == "db.backup":
        db_name = parameters.get("database", "nexgen_platform")
        result = await db.execute(
            select(DatabaseInstance).where(DatabaseInstance.name == db_name)
        )
        instance = result.scalar_one_or_none()
        if not instance or not instance.host:
            return {"action": "backup_failed", "error": f"Database '{db_name}' not found or no host configured"}

        backup_result = await run_pg_backup(
            host=instance.host,
            port=instance.port or 5432,
            database=instance.name,
        )
        if backup_result["success"]:
            instance.last_backup = datetime.now(timezone.utc)
        return {
            "action": "backup_completed" if backup_result["success"] else "backup_failed",
            "database": db_name,
            "backup_path": backup_result.get("backup_path"),
            "size_bytes": backup_result.get("size_bytes"),
            "error": backup_result.get("error"),
        }

    elif command == "security.scan":
        # Real security scan: check alerts, VM states, Proxmox health
        findings = []

        # Check unresolved alerts
        alert_result = await db.execute(
            select(SecurityAlert).where(SecurityAlert.resolved == False)
        )
        unresolved = list(alert_result.scalars().all())
        if unresolved:
            findings.append({
                "check": "unresolved_alerts",
                "status": "warning",
                "count": len(unresolved),
                "details": [
                    {"severity": a.severity, "title": a.title} for a in unresolved[:10]
                ],
            })
        else:
            findings.append({"check": "unresolved_alerts", "status": "pass", "count": 0})

        # Check Proxmox connectivity
        px_health = await proxmox_client.health_check()
        findings.append({
            "check": "proxmox_connectivity",
            "status": "pass" if px_health.get("status") == "healthy" else "critical",
            "details": px_health,
        })

        # Check for VMs in unknown state
        vm_result = await db.execute(
            select(VirtualMachine).where(VirtualMachine.status == "unknown")
        )
        unknown_vms = list(vm_result.scalars().all())
        if unknown_vms:
            findings.append({
                "check": "unknown_vm_states",
                "status": "warning",
                "count": len(unknown_vms),
                "vms": [{"name": v.name, "vmid": v.vmid} for v in unknown_vms],
            })
        else:
            findings.append({"check": "unknown_vm_states", "status": "pass", "count": 0})

        # Check Bedrock connectivity
        llm_health = await llm_proxy.health()
        bedrock_status = llm_health.get("bedrock", {}).get("status", "unknown")
        findings.append({
            "check": "bedrock_connectivity",
            "status": "pass" if bedrock_status == "healthy" else "warning",
            "details": llm_health.get("bedrock", {}),
        })

        overall = "pass"
        for f in findings:
            if f["status"] == "critical":
                overall = "critical"
                break
            elif f["status"] == "warning" and overall == "pass":
                overall = "warning"

        return {
            "scan_status": overall,
            "findings": findings,
            "scanned_at": datetime.now(timezone.utc).isoformat(),
        }

    elif command == "security.alert.list":
        alerts = await db.execute(
            select(SecurityAlert).where(SecurityAlert.resolved == False).limit(20)
        )
        return {
            "alerts": [
                {"id": str(a.id), "severity": a.severity, "title": a.title}
                for a in alerts.scalars().all()
            ]
        }

    elif command == "platform.health":
        px_health = await proxmox_client.health_check()
        llm_health = await llm_proxy.health()
        return {"proxmox": px_health, "bedrock": llm_health["bedrock"]}

    elif command == "platform.metrics":
        node_status = await proxmox_client.get_node_status()
        return {
            "cpu": round(node_status.get("cpu", 0) * 100, 1),
            "ram_used": node_status.get("memory", {}).get("used", 0),
            "ram_total": node_status.get("memory", {}).get("total", 0),
            "uptime": node_status.get("uptime", 0),
        }

    elif command == "llm.complete":
        llm_result = await llm_proxy.complete(parameters.get("prompt", ""))
        return {"response": llm_result["response"], "backend": llm_result["backend"]}

    raise HTTPException(status_code=400, detail=f"Unknown command: {command}")


@router.post("/event", response_model=MurphEventResponse)
async def receive_event(
    event: MurphEvent,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/murph/event — receive events/triggers from Murph.ai agents."""
    body = await request.body()
    if not verify_hmac_signature(body, event.sig):
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")

    result = await db.execute(
        select(MurphAgent).where(MurphAgent.agent_id == event.agent_id)
    )
    agent = result.scalar_one_or_none()
    if agent:
        agent.last_heartbeat = datetime.now(timezone.utc)
        agent.missed_heartbeats = 0
        agent.status = "active"
    else:
        agent = MurphAgent(
            agent_id=event.agent_id,
            name=f"Agent-{event.agent_id}",
            status="active",
            last_heartbeat=datetime.now(timezone.utc),
        )
        db.add(agent)

    event_id = str(uuid.uuid4())

    queued_action = None
    if event.event_type == "command":
        queued_action = f"queued:{event.payload.get('command', 'unknown')}"
    elif event.event_type == "alert":
        queued_action = "alert_processed"

    await log_action(
        db,
        action=f"murph.event.{event.event_type}",
        resource_type="murph_agent",
        resource_id=event.agent_id,
        agent_id=event.agent_id,
        parameters=event.payload,
        outcome="success",
    )

    return MurphEventResponse(
        status="accepted", event_id=event_id, queued_action=queued_action,
    )


@router.get("/status", response_model=MurphStatusResponse)
async def platform_status(
    user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """GET /api/murph/status — platform health for agent heartbeat monitor."""
    vm_count = 0
    px_error = None
    try:
        vms = await proxmox_client.list_vms()
        vm_count = len(vms)
    except Exception as e:
        px_error = str(e)

    alert_result = await db.execute(
        select(SecurityAlert).where(SecurityAlert.resolved == False)
    )
    alert_count = len(list(alert_result.scalars().all()))

    px_health = await proxmox_client.health_check()
    llm_health = await llm_proxy.health()

    services = [
        ServiceHealth(name="proxmox", status=px_health.get("status", "unknown")),
        ServiceHealth(
            name="bedrock",
            status=llm_health["bedrock"]["status"],
            latency_ms=llm_health["bedrock"].get("latency_ms"),
        ),
        ServiceHealth(name="ollama", status="deferred"),
    ]

    return MurphStatusResponse(
        platform_health="degraded" if px_error else "operational",
        vm_count=vm_count,
        alert_count=alert_count,
        services=services,
        last_backup=None,
        llm_router_status="bedrock_only",
    )


@router.post("/command", response_model=MurphCommandResponse)
async def execute_command_endpoint(
    cmd: MurphCommandRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """POST /api/murph/command — execute pre-approved commands via agent."""
    if cmd.command not in APPROVED_COMMANDS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Command '{cmd.command}' not in approved whitelist",
        )

    if cmd.command in DESTRUCTIVE_COMMANDS and not cmd.approval_token:
        raise HTTPException(
            status_code=status.HTTP_428_PRECONDITION_REQUIRED,
            detail=f"Command '{cmd.command}' requires human approval token",
        )

    job_id = str(uuid.uuid4())[:12]
    job = MurphCommand(
        job_id=job_id,
        agent_id=cmd.agent_id,
        command=cmd.command,
        parameters=cmd.parameters,
        status="running",
        requires_approval=cmd.command in DESTRUCTIVE_COMMANDS,
        approved_by=cmd.approval_token,
        started_at=datetime.now(timezone.utc),
    )
    db.add(job)
    await db.flush()

    try:
        result = await _execute_command(cmd.command, cmd.parameters, db)
        job.status = "completed"
        job.progress = 100
        job.result = result
        job.completed_at = datetime.now(timezone.utc)
        job.logs = f"Command {cmd.command} completed successfully"

        await log_action(
            db,
            action=f"murph.command.{cmd.command}",
            resource_type="murph_command",
            resource_id=job_id,
            agent_id=cmd.agent_id,
            parameters=cmd.parameters,
            outcome="success",
        )

        return MurphCommandResponse(job_id=job_id, status="completed", estimated_completion="0s")

    except Exception as e:
        job.status = "failed"
        job.logs = f"Error: {str(e)}"
        job.completed_at = datetime.now(timezone.utc)

        await log_action(
            db,
            action=f"murph.command.{cmd.command}",
            resource_type="murph_command",
            resource_id=job_id,
            agent_id=cmd.agent_id,
            parameters=cmd.parameters,
            outcome="failure",
        )

        logger.error(f"Command execution failed: {cmd.command} — {e}")
        return MurphCommandResponse(job_id=job_id, status="failed", estimated_completion=None)


@router.get("/command/{job_id}", response_model=MurphCommandStatus)
async def get_command_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """GET /api/murph/command/{job_id} — poll command execution status."""
    result = await db.execute(
        select(MurphCommand).where(MurphCommand.job_id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return MurphCommandStatus(
        job_id=job.job_id, status=job.status, progress=job.progress,
        result=job.result, logs=job.logs,
    )


@router.get("/logs")
async def get_audit_logs(
    from_ts: str | None = Query(None, alias="from"),
    to_ts: str | None = Query(None, alias="to"),
    agent_id: str | None = None,
    limit: int = Query(100, le=1000),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """GET /api/murph/logs — fetch audit log entries for agent review."""
    from_dt = datetime.fromisoformat(from_ts) if from_ts else None
    to_dt = datetime.fromisoformat(to_ts) if to_ts else None

    logs = await get_logs(db, agent_id=agent_id, from_ts=from_dt, to_ts=to_dt, limit=limit)
    return [
        MurphLogEntry(
            id=log.id, agent_id=log.agent_id, action=log.action,
            outcome=log.outcome, timestamp=log.timestamp,
        )
        for log in logs
    ]


@router.post("/webhook/register")
async def register_webhook(
    webhook: MurphWebhookRegister,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """POST /api/murph/webhook/register — register a webhook for platform events.

    Persists the webhook URL and subscribed events to the agent record.
    The agent_id is extracted from the callback_url or must be provided.
    """
    valid_events = {
        "vm.created", "vm.deleted", "alert.triggered",
        "backup.completed", "security.violation", "agent.heartbeat.missed",
    }
    invalid = set(webhook.events) - valid_events
    if invalid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid events: {invalid}. Valid: {valid_events}",
        )

    # Find or create the agent for this webhook
    # Use the callback_url as a unique identifier for the webhook source
    result = await db.execute(
        select(MurphAgent).where(MurphAgent.webhook_url == webhook.callback_url)
    )
    agent = result.scalar_one_or_none()

    if agent:
        # Update existing webhook registration
        agent.subscribed_events = webhook.events
        agent.webhook_url = webhook.callback_url
    else:
        # Create a new agent registration for this webhook
        agent_id = f"webhook-{uuid.uuid4().hex[:8]}"
        agent = MurphAgent(
            agent_id=agent_id,
            name=f"Webhook-{webhook.callback_url[:50]}",
            status="active",
            webhook_url=webhook.callback_url,
            subscribed_events=webhook.events,
            last_heartbeat=datetime.now(timezone.utc),
        )
        db.add(agent)

    await log_action(
        db,
        action="murph.webhook.register",
        resource_type="webhook",
        agent_id=agent.agent_id,
        parameters={"callback_url": webhook.callback_url, "events": webhook.events},
        outcome="success",
    )

    return {
        "status": "registered",
        "agent_id": agent.agent_id,
        "callback_url": webhook.callback_url,
        "events": webhook.events,
    }
