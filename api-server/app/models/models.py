"""SQLAlchemy models — platform state, VMs, audit logs, agents, DCOS."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer,
    String, Text, JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(
        Enum("platform_admin", "operator", "viewer", "api_service", name="user_role"),
        default="viewer",
    )
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    last_login = Column(DateTime(timezone=True), nullable=True)

    audit_logs = relationship("AuditLog", back_populates="user")


class VirtualMachine(Base):
    __tablename__ = "virtual_machines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vmid = Column(Integer, unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    status = Column(
        Enum("running", "stopped", "paused", "suspended", "unknown", name="vm_status"),
        default="unknown",
    )
    os_type = Column(String(50))
    cpu_cores = Column(Integer)
    ram_mb = Column(Integer)
    disk_gb = Column(Integer)
    vlan = Column(Integer)
    ip_address = Column(String(45))
    node = Column(String(100), default="r7625")
    template = Column(Boolean, default=False)
    tags = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    snapshots = relationship("VMSnapshot", back_populates="vm")


class VMSnapshot(Base):
    __tablename__ = "vm_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vm_id = Column(UUID(as_uuid=True), ForeignKey("virtual_machines.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    size_mb = Column(Integer)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    vm = relationship("VirtualMachine", back_populates="snapshots")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    agent_id = Column(String(100), nullable=True)
    action = Column(String(200), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(String(200))
    parameters = Column(JSON)
    outcome = Column(Enum("success", "failure", "pending", name="audit_outcome"), default="pending")
    rollback_plan = Column(Text)
    ip_address = Column(String(45))
    timestamp = Column(DateTime(timezone=True), default=utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


class MurphAgent(Base):
    __tablename__ = "murph_agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    status = Column(
        Enum("active", "inactive", "warning", "critical", name="agent_status"),
        default="inactive",
    )
    last_heartbeat = Column(DateTime(timezone=True))
    missed_heartbeats = Column(Integer, default=0)
    registered_at = Column(DateTime(timezone=True), default=utcnow)
    webhook_url = Column(String(500))
    subscribed_events = Column(JSON, default=list)
    agent_type = Column(String(50), default="generic")
    capabilities = Column(JSON, default=list)
    description = Column(String(500), nullable=True)
    version = Column(String(20), nullable=True)
    ip_address = Column(String(45), nullable=True)


class MurphCommand(Base):
    __tablename__ = "murph_commands"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(String(100), unique=True, nullable=False, index=True)
    agent_id = Column(String(100), nullable=False)
    command = Column(String(500), nullable=False)
    parameters = Column(JSON)
    status = Column(
        Enum("queued", "running", "completed", "failed", "cancelled", name="command_status"),
        default="queued",
    )
    progress = Column(Integer, default=0)
    result = Column(JSON)
    logs = Column(Text)
    requires_approval = Column(Boolean, default=False)
    approved_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=utcnow)
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))


class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    severity = Column(
        Enum("critical", "high", "medium", "low", "info", name="alert_severity"),
        nullable=False,
    )
    source = Column(String(100), nullable=False)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    resolved = Column(Boolean, default=False)
    resolved_by = Column(String(100))
    resolved_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)


class DatabaseInstance(Base):
    __tablename__ = "database_instances"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    engine = Column(Enum("postgresql", "mysql", name="db_engine"), nullable=False)
    version = Column(String(20))
    host = Column(String(200))
    port = Column(Integer)
    vm_id = Column(UUID(as_uuid=True), ForeignKey("virtual_machines.id"), nullable=True)
    role = Column(Enum("primary", "replica", "standalone", name="db_role"), default="standalone")
    status = Column(String(50), default="unknown")
    connections_active = Column(Integer, default=0)
    connections_max = Column(Integer, default=100)
    storage_used_gb = Column(Float, default=0)
    storage_total_gb = Column(Float)
    replication_lag_seconds = Column(Float, nullable=True)
    last_backup = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)


class ServiceDeployment(Base):
    __tablename__ = "service_deployments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deployment_id = Column(String(100), unique=True, nullable=False, index=True)
    template_id = Column(String(100), nullable=False)
    template_name = Column(String(200), nullable=False)
    vm_id = Column(UUID(as_uuid=True), ForeignKey("virtual_machines.id"), nullable=True)
    vmid = Column(Integer)
    vm_name = Column(String(100))
    status = Column(String(50), default="deploying")
    message = Column(Text)
    deployed_by = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=utcnow)


class LLMRequest(Base):
    __tablename__ = "llm_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    backend = Column(String(20), default="bedrock")  # bedrock or ollama
    model = Column(String(100))
    prompt_tokens = Column(Integer)
    completion_tokens = Column(Integer)
    latency_ms = Column(Integer)
    estimated_cost_usd = Column(Float, default=0)
    sanitized = Column(Boolean, default=False)
    sanitization_actions = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=utcnow)


# ---------------------------------------------------------------------------
# Digital Chief of Staff (DCOS) — Quantum Communications v2
# ---------------------------------------------------------------------------

class QCMessage(Base):
    """Unified inbox — every inbound communication normalized to one schema."""
    __tablename__ = "qc_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel = Column(String(20), nullable=False, index=True)  # email, slack, teams, sms, voice, platform
    sender_name = Column(String(200), nullable=False)
    sender_address = Column(String(300))  # email, phone, slack handle
    subject = Column(String(500), nullable=False)
    body = Column(Text, nullable=False)
    preview = Column(String(500))
    thread_id = Column(String(200))  # for grouping conversations
    raw_metadata = Column(JSON)  # channel-specific fields
    status = Column(
        Enum("pending", "triaged", "actioned", "archived", name="qc_msg_status"),
        default="pending",
    )
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)

    priority = relationship("DCOSPriority", back_populates="message", uselist=False)
    decision = relationship("DCOSDecision", back_populates="message", uselist=False)


class DCOSPriority(Base):
    """Priority scoring — AI-assigned urgency/importance per message."""
    __tablename__ = "dcos_priorities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("qc_messages.id"), nullable=False, unique=True)
    tier = Column(String(4), nullable=False, index=True)  # P0, P1, P2, P3
    urgency = Column(Integer, default=50)  # 0–100
    importance = Column(Integer, default=50)  # 0–100
    qps = Column(Integer, default=50)  # quantum priority score (composite)
    category = Column(String(50))  # infrastructure, security, business, compliance, personal
    sentiment = Column(String(20))  # positive, neutral, negative, urgent
    deadline = Column(DateTime(timezone=True))
    reasoning = Column(Text)  # AI explanation for the score
    created_at = Column(DateTime(timezone=True), default=utcnow)

    message = relationship("QCMessage", back_populates="priority")


class DCOSDecision(Base):
    """Decision log — what action the AI recommends and whether it was executed."""
    __tablename__ = "dcos_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(as_uuid=True), ForeignKey("qc_messages.id"), nullable=False, unique=True)
    action = Column(String(30), nullable=False)  # respond_now, defer, delegate, archive, escalate
    delegate_to = Column(String(100))  # agent_id or user
    draft_response = Column(Text)
    reasoning = Column(Text)
    approved = Column(Boolean, default=False)
    approved_by = Column(String(100))
    executed = Column(Boolean, default=False)
    executed_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=utcnow)

    message = relationship("QCMessage", back_populates="decision")


class DCOSBriefing(Base):
    """Generated briefings — real-time alerts, daily digests, weekly reports."""
    __tablename__ = "dcos_briefings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    briefing_type = Column(String(20), nullable=False)  # realtime, daily, weekly
    title = Column(String(300), nullable=False)
    content = Column(Text, nullable=False)
    insights = Column(JSON)  # structured insight bullets
    message_ids = Column(JSON, default=list)  # messages covered
    generated_by = Column(String(50), default="bedrock")
    created_at = Column(DateTime(timezone=True), default=utcnow, index=True)
