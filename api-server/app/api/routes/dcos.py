"""Digital Chief of Staff endpoints — communications, triage, briefings, actions."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import QCMessage, DCOSPriority, DCOSDecision, DCOSBriefing
from app.services.audit import log_action
from app.services.dcos_engine import (
    triage_message,
    execute_decision,
    generate_briefing,
    get_dcos_stats,
)

router = APIRouter(prefix="/dcos", tags=["Digital Chief of Staff"])


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class IngestMessageRequest(BaseModel):
    channel: str  # email, slack, teams, sms, voice, platform
    sender_name: str
    sender_address: str | None = None
    subject: str
    body: str
    thread_id: str | None = None
    metadata: dict | None = None


class UpdateDecisionRequest(BaseModel):
    action: str  # respond_now, defer, delegate, archive, escalate


# ---------------------------------------------------------------------------
# Communications CRUD
# ---------------------------------------------------------------------------

@router.get("/messages")
async def list_messages(
    status: str | None = Query(None),
    tier: str | None = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List communications with optional status/tier filtering."""
    query = select(QCMessage).order_by(desc(QCMessage.created_at))
    if status:
        query = query.where(QCMessage.status == status)
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    messages = list(result.scalars().all())

    items = []
    for msg in messages:
        # Load related priority and decision
        pri_r = await db.execute(
            select(DCOSPriority).where(DCOSPriority.message_id == msg.id)
        )
        pri = pri_r.scalar_one_or_none()
        dec_r = await db.execute(
            select(DCOSDecision).where(DCOSDecision.message_id == msg.id)
        )
        dec = dec_r.scalar_one_or_none()

        item = {
            "id": str(msg.id),
            "channel": msg.channel,
            "sender_name": msg.sender_name,
            "sender_address": msg.sender_address,
            "subject": msg.subject,
            "preview": msg.preview or msg.body[:200],
            "body": msg.body,
            "thread_id": msg.thread_id,
            "status": msg.status,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            "priority": None,
            "decision": None,
        }
        if pri:
            item["priority"] = {
                "tier": pri.tier,
                "qps": pri.qps,
                "urgency": pri.urgency,
                "importance": pri.importance,
                "category": pri.category,
                "sentiment": pri.sentiment,
                "deadline": pri.deadline.isoformat() if pri.deadline else None,
                "reasoning": pri.reasoning,
            }
        if dec:
            item["decision"] = {
                "action": dec.action,
                "delegate_to": dec.delegate_to,
                "draft_response": dec.draft_response,
                "reasoning": dec.reasoning,
                "approved": dec.approved,
                "executed": dec.executed,
            }
        # Filter by tier if requested (post-join filter)
        if tier and (not pri or pri.tier != tier):
            continue
        items.append(item)

    return {"messages": items, "total": len(items)}


@router.post("/messages")
async def ingest_message(
    body: IngestMessageRequest,
    auto_triage: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Ingest a new communication and optionally auto-triage via AI."""
    msg = QCMessage(
        channel=body.channel,
        sender_name=body.sender_name,
        sender_address=body.sender_address,
        subject=body.subject,
        body=body.body,
        preview=body.body[:200],
        thread_id=body.thread_id,
        raw_metadata=body.metadata,
        status="pending",
    )
    db.add(msg)
    await db.flush()  # get the id

    await log_action(
        db,
        action="dcos.ingest",
        resource_type="qc_message",
        resource_id=str(msg.id),
        outcome="success",
    )

    if auto_triage:
        triage_result = await triage_message(db, msg)
        return {"message_id": str(msg.id), "status": "triaged", "triage": triage_result}

    await db.commit()
    return {"message_id": str(msg.id), "status": "pending"}


@router.get("/messages/{message_id}")
async def get_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Get a single message with its priority and decision."""
    from uuid import UUID
    result = await db.execute(
        select(QCMessage).where(QCMessage.id == UUID(message_id))
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    pri_r = await db.execute(
        select(DCOSPriority).where(DCOSPriority.message_id == msg.id)
    )
    pri = pri_r.scalar_one_or_none()
    dec_r = await db.execute(
        select(DCOSDecision).where(DCOSDecision.message_id == msg.id)
    )
    dec = dec_r.scalar_one_or_none()

    return {
        "id": str(msg.id),
        "channel": msg.channel,
        "sender_name": msg.sender_name,
        "sender_address": msg.sender_address,
        "subject": msg.subject,
        "body": msg.body,
        "status": msg.status,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
        "priority": {
            "tier": pri.tier,
            "qps": pri.qps,
            "urgency": pri.urgency,
            "importance": pri.importance,
            "category": pri.category,
            "sentiment": pri.sentiment,
            "reasoning": pri.reasoning,
        } if pri else None,
        "decision": {
            "action": dec.action,
            "delegate_to": dec.delegate_to,
            "draft_response": dec.draft_response,
            "reasoning": dec.reasoning,
            "approved": dec.approved,
            "executed": dec.executed,
        } if dec else None,
    }


# ---------------------------------------------------------------------------
# Triage & Actions
# ---------------------------------------------------------------------------

@router.post("/messages/{message_id}/triage")
async def triage_single(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Manually trigger AI triage on a pending message."""
    from uuid import UUID
    result = await db.execute(
        select(QCMessage).where(QCMessage.id == UUID(message_id))
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    triage_result = await triage_message(db, msg)
    return triage_result


@router.post("/messages/{message_id}/execute")
async def execute_action_on_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Approve and execute the AI's recommended action on a message."""
    result = await execute_decision(db, message_id, approved_by=user.get("sub", "admin"))

    await log_action(
        db,
        action="dcos.execute",
        resource_type="qc_message",
        resource_id=message_id,
        outcome="success" if result["success"] else "failure",
    )

    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error", "Failed"))
    return result


@router.patch("/messages/{message_id}/decision")
async def update_decision(
    message_id: str,
    body: UpdateDecisionRequest,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Override the AI's recommended action."""
    from uuid import UUID
    result = await db.execute(
        select(DCOSDecision).where(DCOSDecision.message_id == UUID(message_id))
    )
    dec = result.scalar_one_or_none()
    if not dec:
        raise HTTPException(status_code=404, detail="Decision not found")

    dec.action = body.action
    dec.approved_by = user.get("sub", "admin")
    await db.commit()
    return {"message_id": message_id, "action": dec.action}


@router.post("/messages/{message_id}/archive")
async def archive_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Archive a message."""
    from uuid import UUID
    result = await db.execute(
        select(QCMessage).where(QCMessage.id == UUID(message_id))
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    msg.status = "archived"
    await db.commit()
    return {"message_id": message_id, "status": "archived"}


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Permanently delete a message and its priority/decision."""
    from uuid import UUID
    mid = UUID(message_id)
    result = await db.execute(select(QCMessage).where(QCMessage.id == mid))
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    # Cascade deletes handle priority/decision via FK ON DELETE CASCADE
    await db.delete(msg)
    await log_action(
        db,
        action="dcos.delete",
        resource_type="qc_message",
        resource_id=message_id,
        outcome="success",
    )

    return {"message_id": message_id, "deleted": True}


# ---------------------------------------------------------------------------
# Briefings
# ---------------------------------------------------------------------------

@router.get("/briefings")
async def list_briefings(
    briefing_type: str | None = Query(None),
    limit: int = Query(10, le=50),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """List recent briefings."""
    query = select(DCOSBriefing).order_by(desc(DCOSBriefing.created_at)).limit(limit)
    if briefing_type:
        query = query.where(DCOSBriefing.briefing_type == briefing_type)
    result = await db.execute(query)
    briefings = list(result.scalars().all())
    return {
        "briefings": [
            {
                "id": str(b.id),
                "briefing_type": b.briefing_type,
                "title": b.title,
                "content": b.content,
                "insights": b.insights or [],
                "message_ids": b.message_ids or [],
                "created_at": b.created_at.isoformat() if b.created_at else None,
            }
            for b in briefings
        ]
    }


@router.post("/briefings/generate")
async def generate_briefing_endpoint(
    briefing_type: str = Query("daily"),
    hours: int = Query(24),
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Generate a new AI briefing from recent communications."""
    briefing = await generate_briefing(db, briefing_type=briefing_type, hours=hours)
    return briefing


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.get("/stats")
async def dcos_stats(
    db: AsyncSession = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Dashboard stats for the Chief of Staff overview."""
    return await get_dcos_stats(db)
