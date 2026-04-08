export interface ServiceHealth {
  name: string
  status: 'healthy' | 'unhealthy' | 'deferred' | 'unknown'
  latency_ms: number | null
}

export interface PlatformHealth {
  status: string
  platform: string
  version: string
  uptime_seconds: number
  services: ServiceHealth[]
}

export interface VM {
  id: string
  vmid: number
  name: string
  status: 'running' | 'stopped' | 'paused' | 'suspended' | 'unknown'
  os_type: string | null
  cpu_cores: number | null
  ram_mb: number | null
  disk_gb: number | null
  vlan: number | null
  ip_address: string | null
  node: string
  template: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export interface AuditLogEntry {
  id: string
  user_id: string | null
  agent_id: string | null
  action: string
  resource_type: string | null
  resource_id: string | null
  outcome: string
  timestamp: string
  parameters?: Record<string, unknown> | null
  rollback_plan?: string | null
  ip_address?: string | null
}

export interface SecurityAlert {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  source: string
  title: string
  description: string | null
  resolved: boolean
  created_at: string
}

export interface MurphAgent {
  agent_id: string
  name: string
  status: 'active' | 'inactive' | 'warning' | 'critical'
  agent_type?: string
  capabilities?: string[]
  description?: string
  version?: string
  last_heartbeat: string | null
  missed_heartbeats: number
  registered_at?: string | null
  webhook_url?: string | null
  subscribed_events?: string[]
}

export interface AgentDetail extends MurphAgent {
  recent_commands: {
    job_id: string
    command: string
    status: string
    progress: number
    created_at: string | null
  }[]
}

export interface DatabaseInstance {
  id: string
  name: string
  engine: 'postgresql' | 'mysql'
  version: string | null
  host: string | null
  port: number | null
  role: 'primary' | 'replica' | 'standalone'
  status: string
  connections_active: number
  connections_max: number
  storage_used_gb: number
  replication_lag_seconds: number | null
  last_backup: string | null
}

export interface LLMStats {
  total_requests: number
  bedrock_requests: number
  ollama_requests: number
  avg_latency_ms: number
  estimated_cost_usd: number
}

export interface SystemMetrics {
  cpu_percent: number
  ram_used_gb: number
  ram_total_gb: number
  storage_used_gb: number
  storage_total_gb: number
  network_rx_mbps: number
  network_tx_mbps: number
  source?: string
  error?: string
  uptime_seconds?: number
  loadavg?: number[]
  cpu_count?: number
  cpu_model?: string
}

export interface NetworkInterface {
  name: string
  type: string
  address: string | null
  netmask: string | null
  cidr: string | null
  gateway: string | null
  active: boolean
  autostart: boolean
  bridge_ports: string | null
  comments: string | null
}

export interface NetworkTopology {
  vlans: NetworkInterface[]
  bridges: NetworkInterface[]
  interfaces: Record<string, unknown>[]
  source: string
  error?: string
}

export interface StoragePool {
  storage: string
  type: string
  content: string
  total_bytes: number
  used_bytes: number
  available_bytes: number
  active: boolean
  enabled: number
  shared: number
}

export interface StorageInfo {
  pools: StoragePool[]
  source: string
  error?: string
}

export interface ComplianceControl {
  id: string
  domain: string
  description: string
  status: 'implemented' | 'attention_needed' | 'not_implemented'
  evidence: string
}

export interface ComplianceSummary {
  timestamp: string
  total_controls: number
  passing: number
  attention_needed: number
  compliance_score: number
  controls: ComplianceControl[]
  frameworks: string[]
}

export interface ServiceTemplate {
  id: string
  name: string
  category: string
  description: string
  icon: string
  vm_config: {
    cores: number
    ram_mb: number
    disk_gb: number
    vlan: number
    os_type: string
  }
  requires_iso: string | null
  post_install_notes: string
}

export interface ServiceDeployment {
  deployment_id: string
  template_id: string
  template_name: string
  vm_id: string
  vmid: number
  vm_name: string
  status: string
  message: string
}

export interface SSHHost {
  name: string
  host: string
  port: number
  username: string
  group: string
}

export interface UserAccount {
  id: string
  username: string
  email: string
  role: 'platform_admin' | 'operator' | 'viewer' | 'api_service'
  mfa_enabled: boolean
  is_active: boolean
  created_at: string | null
  last_login: string | null
}

// Digital Chief of Staff (DCOS)
export interface DCOSPriority {
  tier: 'P0' | 'P1' | 'P2' | 'P3'
  qps: number
  urgency: number
  importance: number
  category: string
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
  deadline: string | null
  reasoning: string
}

export interface DCOSDecision {
  action: 'respond_now' | 'defer' | 'delegate' | 'archive' | 'escalate'
  delegate_to: string | null
  draft_response: string | null
  reasoning: string
  approved: boolean
  executed: boolean
}

export interface QCMessage {
  id: string
  channel: 'email' | 'slack' | 'teams' | 'sms' | 'voice' | 'platform'
  sender_name: string
  sender_address: string | null
  subject: string
  preview: string
  body: string
  thread_id: string | null
  status: 'pending' | 'triaged' | 'actioned' | 'archived'
  created_at: string | null
  priority: DCOSPriority | null
  decision: DCOSDecision | null
}

export interface DCOSBriefing {
  id: string
  briefing_type: 'realtime' | 'daily' | 'weekly'
  title: string
  content: string
  insights: { label: string; text?: string; items?: string[] }[]
  message_ids: string[]
  created_at: string | null
}

export interface DCOSStats {
  total_messages: number
  pending: number
  triaged_today: number
  p0_count: number
  p1_count: number
  avg_qps: number
  auto_triage_pct: number
}

// Runbooks
export interface RunbookStep {
  id: string
  step_order: number
  action: string
  target: string | null
  step_type: string
}

export interface Runbook {
  id: string
  name: string
  description: string | null
  trigger: 'manual' | 'alert' | 'schedule' | 'threshold'
  status: 'ready' | 'running' | 'completed' | 'failed'
  last_run: string | null
  created_by: string | null
  created_at: string | null
  steps: RunbookStep[]
}

// Guacamole / Remote Desktop
export interface GuacConnection {
  id: string
  vmid: number | null
  vm_name: string | null
  vm_status: string | null
  name: string
  protocol: 'rdp' | 'vnc' | 'ssh'
  host: string
  port: number
  username: string | null
  guac_token: string | null
  notes: string | null
  created_at: string | null
}
