"""Pydantic schemas for API request/response validation."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


# --- Health ---
class HealthResponse(BaseModel):
    status: str = "healthy"
    platform: str = "Murph.AI NexGen Platform"
    version: str
    uptime_seconds: float
    services: list[dict]


class ServiceHealth(BaseModel):
    name: str
    status: str
    latency_ms: float | None = None


# --- VM ---
class VMCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    os_type: str = "ubuntu-22.04"
    cpu_cores: int = Field(ge=1, le=64)
    ram_mb: int = Field(ge=512, le=131072)
    disk_gb: int = Field(ge=10, le=4000)
    vlan: int = Field(ge=10, le=50)
    template: bool = False
    tags: list[str] = []


class VMResponse(BaseModel):
    id: UUID
    vmid: int
    name: str
    status: str
    os_type: str | None
    cpu_cores: int | None
    ram_mb: int | None
    disk_gb: int | None
    vlan: int | None
    ip_address: str | None
    node: str
    template: bool
    tags: list
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VMAction(BaseModel):
    action: str = Field(description="start | stop | restart | snapshot | delete")
    parameters: dict = {}


# --- Audit ---
class AuditLogResponse(BaseModel):
    id: UUID
    user_id: UUID | None
    agent_id: str | None
    action: str
    resource_type: str | None
    resource_id: str | None
    parameters: dict | None
    outcome: str
    timestamp: datetime

    model_config = {"from_attributes": True}


# --- Murph.ai ---
class MurphEvent(BaseModel):
    agent_id: str
    event_type: str
    payload: dict
    timestamp: str
    sig: str


class MurphEventResponse(BaseModel):
    status: str
    event_id: str
    queued_action: str | None = None


class MurphStatusResponse(BaseModel):
    platform_health: str
    vm_count: int
    alert_count: int
    services: list[ServiceHealth]
    last_backup: datetime | None
    llm_router_status: str


class MurphCommandRequest(BaseModel):
    agent_id: str
    command: str
    parameters: dict = {}
    approval_token: str | None = None


class MurphCommandResponse(BaseModel):
    job_id: str
    status: str
    estimated_completion: str | None = None


class MurphCommandStatus(BaseModel):
    job_id: str
    status: str
    progress: int
    result: dict | None = None
    logs: str | None = None


class MurphWebhookRegister(BaseModel):
    callback_url: str
    events: list[str]
    secret: str


class MurphLogEntry(BaseModel):
    id: UUID
    agent_id: str | None
    action: str
    outcome: str
    timestamp: datetime

    model_config = {"from_attributes": True}


# --- LLM ---
class LLMCompleteRequest(BaseModel):
    prompt: str
    context: dict = {}
    force_backend: str | None = None  # "bedrock" or "ollama" (when available)
    agent_type: str | None = None  # optional specialized agent type


class LLMCompleteResponse(BaseModel):
    response: str
    backend: str
    model: str
    latency_ms: int
    sanitized: bool
    sanitization_actions: list[str] = []
    action_executed: bool = False
    action_result: dict | None = None


class LLMHealthResponse(BaseModel):
    bedrock: ServiceHealth
    ollama: ServiceHealth


class LLMStatsResponse(BaseModel):
    total_requests: int
    bedrock_requests: int
    ollama_requests: int
    avg_latency_ms: float
    estimated_cost_usd: float


# --- Security Alerts ---
class SecurityAlertResponse(BaseModel):
    id: UUID
    severity: str
    source: str
    title: str
    description: str | None
    resolved: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Database ---
class DatabaseInstanceResponse(BaseModel):
    id: UUID
    name: str
    engine: str
    version: str | None
    host: str | None
    port: int | None
    role: str
    status: str
    connections_active: int
    connections_max: int
    storage_used_gb: float
    replication_lag_seconds: float | None
    last_backup: datetime | None

    model_config = {"from_attributes": True}


# --- System Metrics (WebSocket) ---
class SystemMetrics(BaseModel):
    cpu_percent: float
    ram_used_gb: float
    ram_total_gb: float
    storage_used_gb: float
    storage_total_gb: float
    network_rx_mbps: float
    network_tx_mbps: float
    timestamp: datetime
