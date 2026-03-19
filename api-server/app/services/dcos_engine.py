"""Digital Chief of Staff — Priority Engine, Decision Matrix, and Briefing Engine.

Processes inbound communications through AI-powered triage:
1. Priority Engine: scores urgency/importance, assigns P0–P3 tier
2. Decision Matrix: determines action (respond_now, defer, delegate, archive, escalate)
3. Briefing Engine: generates daily briefings from accumulated messages
"""

import json
import logging
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    QCMessage, DCOSPriority, DCOSDecision, DCOSBriefing,
    SecurityAlert, MurphAgent,
)
from app.services.llm_proxy import llm_proxy

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Priority Engine
# ---------------------------------------------------------------------------

TRIAGE_SYSTEM_PROMPT = """You are the Digital Chief of Staff AI for the Roosk.AI platform.
You triage inbound communications by analyzing urgency, importance, and sentiment.

For each message, return a JSON object with EXACTLY these fields:
{
  "urgency": <0-100 integer>,
  "importance": <0-100 integer>,
  "category": "<infrastructure|security|business|compliance|personal|operations>",
  "sentiment": "<positive|neutral|negative|urgent>",
  "deadline_hours": <null or number of hours until action needed>,
  "action": "<respond_now|defer|delegate|archive|escalate>",
  "delegate_to": "<agent id or null>",
  "draft_response": "<short draft reply or null>",
  "priority_reasoning": "<1-2 sentence explanation for priority>",
  "action_reasoning": "<1-2 sentence explanation for recommended action>"
}

Scoring guidelines:
- P0 (QPS 85-100): Production down, security breach, exec deadline <2hrs
- P1 (QPS 65-84): Important business, compliance deadline <48hrs, partner escalation
- P2 (QPS 35-64): Routine ops, resolved incidents, standard requests
- P3 (QPS 0-34): FYI, low-priority, newsletters, no action needed

QPS = (urgency * 0.6) + (importance * 0.4)

Available agents for delegation:
- murph-infrastructure: VM, storage, compute issues
- murph-security: alerts, compliance, access control
- murph-database: PostgreSQL, backups, replication
- murph-networking: VLANs, VPN, DNS, firewall
- murph-monitoring: metrics, dashboards, alerting
- murph-daas: remote desktop, Guacamole, code-server

Return ONLY the JSON object, no markdown fences, no explanation outside JSON."""


async def triage_message(db: AsyncSession, message: QCMessage) -> dict:
    """Run a message through the Priority Engine and Decision Matrix.

    Returns the combined triage result dict with priority + decision fields.
    """
    prompt = (
        f"Triage this communication:\n"
        f"Channel: {message.channel}\n"
        f"From: {message.sender_name} ({message.sender_address or 'unknown'})\n"
        f"Subject: {message.subject}\n"
        f"Body: {message.body[:2000]}\n"
        f"Received: {message.created_at.isoformat() if message.created_at else 'just now'}"
    )

    # Gather platform context for better triage
    try:
        alert_count = await db.scalar(
            select(func.count(SecurityAlert.id)).where(SecurityAlert.resolved == False)
        ) or 0
        agent_count = await db.scalar(
            select(func.count(MurphAgent.id)).where(MurphAgent.status == "active")
        ) or 0
        prompt += f"\n\nPlatform context: {alert_count} unresolved alerts, {agent_count} active agents"
    except Exception:
        pass

    result = await llm_proxy.complete(
        prompt=prompt,
        system_prompt=TRIAGE_SYSTEM_PROMPT,
    )

    # Parse AI response
    triage = _parse_triage_json(result["response"])

    # Calculate QPS and tier
    urgency = triage.get("urgency", 50)
    importance = triage.get("importance", 50)
    qps = int(urgency * 0.6 + importance * 0.4)
    tier = _qps_to_tier(qps)

    # Upsert priority (update if re-triage, create if first)
    existing_pri = await db.execute(
        select(DCOSPriority).where(DCOSPriority.message_id == message.id)
    )
    priority = existing_pri.scalar_one_or_none()
    if priority:
        priority.tier = tier
        priority.urgency = urgency
        priority.importance = importance
        priority.qps = qps
        priority.category = triage.get("category", "operations")
        priority.sentiment = triage.get("sentiment", "neutral")
        priority.reasoning = triage.get("priority_reasoning", "")
    else:
        priority = DCOSPriority(
            message_id=message.id,
            tier=tier,
            urgency=urgency,
            importance=importance,
            qps=qps,
            category=triage.get("category", "operations"),
            sentiment=triage.get("sentiment", "neutral"),
            reasoning=triage.get("priority_reasoning", ""),
        )
        db.add(priority)
    if triage.get("deadline_hours"):
        priority.deadline = datetime.now(timezone.utc) + timedelta(
            hours=triage["deadline_hours"]
        )

    # Upsert decision
    existing_dec = await db.execute(
        select(DCOSDecision).where(DCOSDecision.message_id == message.id)
    )
    decision = existing_dec.scalar_one_or_none()
    if decision:
        decision.action = triage.get("action", "defer")
        decision.delegate_to = triage.get("delegate_to")
        decision.draft_response = triage.get("draft_response")
        decision.reasoning = triage.get("action_reasoning", "")
        decision.approved = False
        decision.executed = False
        decision.executed_at = None
    else:
        decision = DCOSDecision(
            message_id=message.id,
            action=triage.get("action", "defer"),
            delegate_to=triage.get("delegate_to"),
            draft_response=triage.get("draft_response"),
            reasoning=triage.get("action_reasoning", ""),
        )
        db.add(decision)

    # Update message status
    message.status = "triaged"
    await db.commit()

    return {
        "message_id": str(message.id),
        "tier": tier,
        "qps": qps,
        "urgency": urgency,
        "importance": importance,
        "category": triage.get("category", "operations"),
        "sentiment": triage.get("sentiment", "neutral"),
        "action": triage.get("action", "defer"),
        "delegate_to": triage.get("delegate_to"),
        "draft_response": triage.get("draft_response"),
        "reasoning": triage.get("priority_reasoning", ""),
    }


def _parse_triage_json(text: str) -> dict:
    """Extract JSON from LLM response, handling markdown fences."""
    text = text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object in the response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end])
            except json.JSONDecodeError:
                pass
    logger.warning("Failed to parse triage JSON: %s", text[:200])
    return {}


def _qps_to_tier(qps: int) -> str:
    if qps >= 85:
        return "P0"
    if qps >= 65:
        return "P1"
    if qps >= 35:
        return "P2"
    return "P3"


# ---------------------------------------------------------------------------
# Decision Execution
# ---------------------------------------------------------------------------

async def execute_decision(
    db: AsyncSession, message_id: str, approved_by: str = "admin"
) -> dict:
    """Mark a decision as approved and executed."""
    from uuid import UUID

    result = await db.execute(
        select(DCOSDecision).where(DCOSDecision.message_id == UUID(message_id))
    )
    decision = result.scalar_one_or_none()
    if not decision:
        return {"success": False, "error": "Decision not found"}

    decision.approved = True
    decision.approved_by = approved_by
    decision.executed = True
    decision.executed_at = datetime.now(timezone.utc)

    # Update message status
    msg_result = await db.execute(
        select(QCMessage).where(QCMessage.id == UUID(message_id))
    )
    msg = msg_result.scalar_one_or_none()
    if msg:
        msg.status = "actioned"

    await db.commit()
    return {"success": True, "action": decision.action, "message_id": message_id}


# ---------------------------------------------------------------------------
# Briefing Engine
# ---------------------------------------------------------------------------

BRIEFING_SYSTEM_PROMPT = """You are the Digital Chief of Staff generating an executive briefing.
Analyze the communications summary below and produce a structured briefing.

Return a JSON object:
{
  "title": "<briefing title>",
  "executive_summary": "<2-3 sentence overview>",
  "insights": [
    {"label": "<insight category>", "text": "<insight detail>"},
    ...
  ],
  "action_items": [
    {"priority": "P0|P1|P2|P3", "text": "<action needed>"},
    ...
  ],
  "risk_flags": ["<any risks or concerns>"]
}

Be concise and actionable. Focus on what requires the executive's attention.
Return ONLY the JSON object."""


async def generate_briefing(
    db: AsyncSession,
    briefing_type: str = "daily",
    hours: int = 24,
) -> dict:
    """Generate a briefing from recent communications."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    # Fetch recent messages with priorities
    result = await db.execute(
        select(QCMessage)
        .where(QCMessage.created_at >= cutoff)
        .order_by(desc(QCMessage.created_at))
        .limit(50)
    )
    messages = list(result.scalars().all())

    if not messages:
        # No messages — generate a status briefing
        briefing = DCOSBriefing(
            briefing_type=briefing_type,
            title=f"{'Daily' if briefing_type == 'daily' else 'Weekly'} Briefing — No New Communications",
            content="No new communications received in the reporting period. All systems nominal.",
            insights=[{"label": "Status", "text": "Inbox clear. No pending actions."}],
            message_ids=[],
        )
        db.add(briefing)
        await db.commit()
        return _briefing_to_dict(briefing)

    # Build summary for LLM
    msg_summaries = []
    message_ids = []
    for msg in messages:
        message_ids.append(str(msg.id))
        # Load priority if available
        pri_result = await db.execute(
            select(DCOSPriority).where(DCOSPriority.message_id == msg.id)
        )
        pri = pri_result.scalar_one_or_none()
        dec_result = await db.execute(
            select(DCOSDecision).where(DCOSDecision.message_id == msg.id)
        )
        dec = dec_result.scalar_one_or_none()

        summary = (
            f"- [{pri.tier if pri else '??'}] {msg.channel.upper()} from {msg.sender_name}: "
            f"{msg.subject} | QPS: {pri.qps if pri else '?'} | "
            f"Action: {dec.action if dec else 'pending'} | "
            f"Status: {msg.status}"
        )
        msg_summaries.append(summary)

    prompt = (
        f"Generate a {briefing_type} briefing for the following {len(messages)} communications "
        f"received in the last {hours} hours:\n\n"
        + "\n".join(msg_summaries)
    )

    result = await llm_proxy.complete(
        prompt=prompt,
        system_prompt=BRIEFING_SYSTEM_PROMPT,
    )

    briefing_data = _parse_triage_json(result["response"])

    briefing = DCOSBriefing(
        briefing_type=briefing_type,
        title=briefing_data.get("title", f"{'Daily' if briefing_type == 'daily' else 'Weekly'} Briefing"),
        content=briefing_data.get("executive_summary", result["response"]),
        insights=briefing_data.get("insights", [])
        + [{"label": "Action Items", "items": briefing_data.get("action_items", [])}]
        + [{"label": "Risk Flags", "items": briefing_data.get("risk_flags", [])}],
        message_ids=message_ids,
    )
    db.add(briefing)
    await db.commit()

    return _briefing_to_dict(briefing)


def _briefing_to_dict(b: DCOSBriefing) -> dict:
    return {
        "id": str(b.id),
        "briefing_type": b.briefing_type,
        "title": b.title,
        "content": b.content,
        "insights": b.insights or [],
        "message_ids": b.message_ids or [],
        "created_at": b.created_at.isoformat() if b.created_at else None,
    }


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

async def get_dcos_stats(db: AsyncSession) -> dict:
    """Dashboard stats for the Chief of Staff page."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_msgs = await db.scalar(select(func.count(QCMessage.id))) or 0
    pending = await db.scalar(
        select(func.count(QCMessage.id)).where(QCMessage.status == "pending")
    ) or 0
    triaged_today = await db.scalar(
        select(func.count(QCMessage.id)).where(
            QCMessage.status != "pending",
            QCMessage.created_at >= today_start,
        )
    ) or 0
    p0_count = await db.scalar(
        select(func.count(DCOSPriority.id)).where(DCOSPriority.tier == "P0")
    ) or 0
    p1_count = await db.scalar(
        select(func.count(DCOSPriority.id)).where(DCOSPriority.tier == "P1")
    ) or 0
    avg_qps = await db.scalar(select(func.avg(DCOSPriority.qps))) or 0

    total_with_decisions = await db.scalar(
        select(func.count(QCMessage.id)).where(QCMessage.status != "pending")
    ) or 0
    auto_triage_pct = round(total_with_decisions / total_msgs * 100) if total_msgs > 0 else 0

    return {
        "total_messages": total_msgs,
        "pending": pending,
        "triaged_today": triaged_today,
        "p0_count": p0_count,
        "p1_count": p1_count,
        "avg_qps": round(float(avg_qps)),
        "auto_triage_pct": auto_triage_pct,
    }
