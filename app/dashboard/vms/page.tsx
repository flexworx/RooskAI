'use client'

import { useCallback, useState, useMemo, useEffect } from 'react'
import {
  Server, Plus, Play, Square, RotateCcw, Pause,
  Database, Shield, Network, Activity, Monitor,
  Globe, Code2, Brain, Eye, GitBranch, HardDrive,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getVMs, vmAction, getVMMetrics } from '@/services/api'
import { DashboardSearch } from '@/components/ui/DashboardSearch'
import { ExportButton } from '@/components/ui/ExportButton'
import { VMCreateWizard } from '@/components/dashboard/VMCreateWizard'
import { clsx } from 'clsx'
import type { VM } from '@/types'

// ─── Role inference ──────────────────────────────────────────────────────────

const ROLE_MAP: { pattern: RegExp; label: string; icon: React.ElementType; color: string }[] = [
  { pattern: /vm-app/i,        label: 'App Server',          icon: Server,    color: 'text-nexgen-accent' },
  { pattern: /vm-db/i,         label: 'Database',            icon: Database,  color: 'text-nexgen-blue' },
  { pattern: /vm-vpn/i,        label: 'VPN Gateway',         icon: Shield,    color: 'text-nexgen-green' },
  { pattern: /vm-fw/i,         label: 'Firewall',            icon: Shield,    color: 'text-nexgen-red' },
  { pattern: /vm-proxy/i,      label: 'Reverse Proxy',       icon: Network,   color: 'text-nexgen-amber' },
  { pattern: /vm-mon/i,        label: 'Monitoring',          icon: Activity,  color: 'text-nexgen-green' },
  { pattern: /vm-iam/i,        label: 'Identity / Auth',     icon: Shield,    color: 'text-nexgen-blue' },
  { pattern: /vm-sec/i,        label: 'Secrets / Vault',     icon: Shield,    color: 'text-nexgen-amber' },
  { pattern: /vm-siem/i,       label: 'SIEM / Logs',         icon: Eye,       color: 'text-nexgen-red' },
  { pattern: /vm-git/i,        label: 'Source Control',      icon: GitBranch, color: 'text-nexgen-accent' },
  { pattern: /vm-llm/i,        label: 'AI / LLM',            icon: Brain,     color: 'text-nexgen-accent' },
  { pattern: /vm-desktop/i,    label: 'Windows Desktop',     icon: Monitor,   color: 'text-nexgen-amber' },
  { pattern: /vm-guac/i,       label: 'Remote Desktop GW',   icon: Globe,     color: 'text-nexgen-green' },
  { pattern: /vm-dev/i,        label: 'Dev Environment',     icon: Code2,     color: 'text-nexgen-blue' },
  { pattern: /vm-stor/i,       label: 'Storage',             icon: HardDrive, color: 'text-nexgen-muted' },
]

const TAG_ROLE_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  'windows-desktop': { label: 'Windows Desktop',   icon: Monitor,   color: 'text-nexgen-amber' },
  'wireguard-vpn':   { label: 'VPN Gateway',       icon: Shield,    color: 'text-nexgen-green' },
  'guacamole':       { label: 'Remote Desktop GW', icon: Globe,     color: 'text-nexgen-green' },
  'code-server':     { label: 'VS Code Server',    icon: Code2,     color: 'text-nexgen-blue' },
  'dev-environment': { label: 'Dev Environment',   icon: Code2,     color: 'text-nexgen-blue' },
  'opnsense-firewall': { label: 'Firewall',        icon: Shield,    color: 'text-nexgen-red' },
}

function inferRole(vm: VM): { label: string; icon: React.ElementType; color: string } {
  // 1. Check service tags first (set at deploy time)
  for (const tag of vm.tags ?? []) {
    if (TAG_ROLE_MAP[tag]) return TAG_ROLE_MAP[tag]
  }
  // 2. Match name pattern
  for (const { pattern, label, icon, color } of ROLE_MAP) {
    if (pattern.test(vm.name)) return { label, icon, color }
  }
  // 3. Fall back to OS type
  if (vm.os_type?.includes('win')) return { label: 'Windows VM',   icon: Monitor,   color: 'text-nexgen-muted' }
  if (vm.os_type?.includes('ubuntu') || vm.os_type?.includes('debian'))
    return { label: 'Linux VM', icon: Server, color: 'text-nexgen-muted' }
  return { label: 'Virtual Machine', icon: Server, color: 'text-nexgen-muted' }
}

// ─── Metric bar ──────────────────────────────────────────────────────────────

function MetricBar({ label, pct, warn = 70, crit = 90 }: {
  label: string; pct: number; warn?: number; crit?: number
}) {
  const color = pct >= crit ? 'bg-nexgen-red' : pct >= warn ? 'bg-nexgen-amber' : 'bg-nexgen-green'
  return (
    <div>
      <div className="flex justify-between text-[10px] font-mono mb-1">
        <span className="text-nexgen-muted">{label}</span>
        <span className={pct >= crit ? 'text-nexgen-red' : pct >= warn ? 'text-nexgen-amber' : 'text-nexgen-green'}>
          {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-nexgen-border/20 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

// ─── Activity dots ────────────────────────────────────────────────────────────

function ActivityDot({ label, value, unit }: { label: string; value: number; unit: string }) {
  const active = value > 0.01
  return (
    <div className="flex items-center gap-1">
      <span className={clsx('w-1.5 h-1.5 rounded-full', active ? 'bg-nexgen-green animate-pulse' : 'bg-nexgen-border/40')} />
      <span className="text-[9px] font-mono text-nexgen-muted">
        {label} {active ? `${value.toFixed(2)} ${unit}` : 'idle'}
      </span>
    </div>
  )
}

// ─── VM card with live metrics ────────────────────────────────────────────────

type VMMetrics = {
  cpu_percent: number
  mem_percent: number
  disk_read_mbps: number
  disk_write_mbps: number
  net_in_mbps: number
  net_out_mbps: number
}

function VMCard({
  vm,
  acting,
  onAction,
}: {
  vm: VM
  acting: boolean
  onAction: (action: string) => void
}) {
  const [metrics, setMetrics] = useState<VMMetrics | null>(null)
  const role = inferRole(vm)
  const RoleIcon = role.icon
  const isRunning = vm.status === 'running'

  // Poll metrics every 15 s, only for running VMs
  useEffect(() => {
    if (!isRunning) { setMetrics(null); return }
    let cancelled = false
    const fetch = async () => {
      try {
        const res = await getVMMetrics(vm.id)
        if (!cancelled && res.current && Object.keys(res.current).length > 0) {
          setMetrics(res.current as VMMetrics)
        }
      } catch { /* silently ignore if metrics unavailable */ }
    }
    fetch()
    const id = setInterval(fetch, 15_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [vm.id, isRunning])

  const isBusy = isRunning && metrics && (
    metrics.cpu_percent > 5 ||
    metrics.disk_read_mbps > 0.01 ||
    metrics.disk_write_mbps > 0.01 ||
    metrics.net_in_mbps > 0.01 ||
    metrics.net_out_mbps > 0.01
  )

  const statusStyles: Record<string, string> = {
    running: 'status-running',
    stopped: 'status-stopped',
    paused:  'status-warning',
    unknown: 'status-badge bg-nexgen-muted/20 text-nexgen-muted',
  }

  return (
    <div className={clsx('glass-card-hover p-5', isBusy && 'ring-1 ring-nexgen-green/20')}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={clsx('w-8 h-8 rounded-lg bg-nexgen-card flex items-center justify-center shrink-0', isBusy && 'animate-pulse')}>
            <RoleIcon size={16} className={role.color} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-mono font-semibold text-nexgen-text truncate">{vm.name}</h3>
            <p className={clsx('text-[10px] font-mono', role.color)}>{role.label}</p>
          </div>
        </div>
        <span className={statusStyles[vm.status] ?? statusStyles['unknown']}>{vm.status}</span>
      </div>

      {/* Static specs */}
      <div className="space-y-1 text-[11px] text-nexgen-muted font-mono mb-3">
        <div className="flex justify-between">
          <span>VMID</span><span className="text-nexgen-text">{vm.vmid}</span>
        </div>
        {vm.cpu_cores && (
          <div className="flex justify-between">
            <span>CPU</span><span className="text-nexgen-text">{vm.cpu_cores} cores</span>
          </div>
        )}
        {vm.ram_mb && (
          <div className="flex justify-between">
            <span>RAM</span><span className="text-nexgen-text">{(vm.ram_mb / 1024).toFixed(0)} GB</span>
          </div>
        )}
        {vm.ip_address && (
          <div className="flex justify-between">
            <span>IP</span><span className="text-nexgen-text">{vm.ip_address}</span>
          </div>
        )}
        {vm.vlan && (
          <div className="flex justify-between">
            <span>VLAN</span><span className="text-nexgen-text">{vm.vlan}</span>
          </div>
        )}
      </div>

      {/* Live metrics — only shown for running VMs once data arrives */}
      {isRunning && metrics && (
        <div className="space-y-2 mb-3 pt-3 border-t border-nexgen-border/10">
          <MetricBar label="CPU" pct={metrics.cpu_percent} />
          <MetricBar label="RAM" pct={metrics.mem_percent} />
          <div className="grid grid-cols-2 gap-x-3 pt-1">
            <ActivityDot label="Disk R" value={metrics.disk_read_mbps}  unit="MB/s" />
            <ActivityDot label="Disk W" value={metrics.disk_write_mbps} unit="MB/s" />
            <ActivityDot label="Net ↓"  value={metrics.net_in_mbps}     unit="MB/s" />
            <ActivityDot label="Net ↑"  value={metrics.net_out_mbps}    unit="MB/s" />
          </div>
        </div>
      )}

      {/* Loading shimmer while waiting for first metrics */}
      {isRunning && !metrics && (
        <div className="space-y-2 mb-3 pt-3 border-t border-nexgen-border/10 animate-pulse">
          <div className="h-3 bg-nexgen-border/20 rounded w-full" />
          <div className="h-3 bg-nexgen-border/20 rounded w-full" />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-1.5">
        {vm.status === 'stopped' && (
          <button
            onClick={() => onAction('start')}
            disabled={acting}
            className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-nexgen-green/10 text-nexgen-green text-[10px] hover:bg-nexgen-green/20 transition-colors disabled:opacity-50"
          >
            <Play size={10} /> Start
          </button>
        )}
        {vm.status === 'running' && (
          <>
            <button
              onClick={() => onAction('stop')}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-nexgen-red/10 text-nexgen-red text-[10px] hover:bg-nexgen-red/20 transition-colors disabled:opacity-50"
            >
              <Square size={10} /> Stop
            </button>
            <button
              onClick={() => onAction('restart')}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-nexgen-amber/10 text-nexgen-amber text-[10px] hover:bg-nexgen-amber/20 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={10} /> Restart
            </button>
            <button
              onClick={() => onAction('pause')}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-nexgen-blue/10 text-nexgen-blue text-[10px] hover:bg-nexgen-blue/20 transition-colors disabled:opacity-50"
            >
              <Pause size={10} /> Pause
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

const statusStyles: Record<string, string> = {
  running: 'status-running',
  stopped: 'status-stopped',
  paused: 'status-warning',
  unknown: 'status-badge bg-nexgen-muted/20 text-nexgen-muted',
}

export default function VirtualMachinesPage() {
  const fetcher = useCallback(() => getVMs(), [])
  const { data, loading, refetch } = useApi<VM[]>(fetcher, 15000)
  const [acting, setActing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showWizard, setShowWizard] = useState(false)

  const allVms = Array.isArray(data) ? data : []
  const vms = useMemo(() => {
    if (!search) return allVms
    const q = search.toLowerCase()
    return allVms.filter((vm) =>
      vm.name.toLowerCase().includes(q) ||
      vm.ip_address?.toLowerCase().includes(q) ||
      vm.status.toLowerCase().includes(q) ||
      vm.os_type?.toLowerCase().includes(q) ||
      inferRole(vm).label.toLowerCase().includes(q)
    )
  }, [allVms, search])

  // Quick-count summary
  const running = allVms.filter((v) => v.status === 'running').length
  const stopped = allVms.filter((v) => v.status === 'stopped').length

  const handleAction = async (vmId: string, action: string) => {
    setActing(vmId)
    try { await vmAction(vmId, action); refetch() }
    catch { /* handled by UI */ }
    setActing(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
            <Server size={22} className="text-nexgen-accent" />
            Virtual Machines
          </h1>
          {!loading && (
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded-full bg-nexgen-green/10 text-nexgen-green">{running} running</span>
              <span className="px-2 py-0.5 rounded-full bg-nexgen-muted/10 text-nexgen-muted">{stopped} stopped</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <DashboardSearch placeholder="Search VMs, roles, IPs…" value={search} onChange={setSearch} />
          <ExportButton
            data={vms.map((v) => ({
              name: v.name, role: inferRole(v).label,
              vmid: v.vmid, status: v.status, ip: v.ip_address,
              cpu: v.cpu_cores, ram_gb: v.ram_mb ? Math.round(v.ram_mb / 1024) : '',
              disk_gb: v.disk_gb, vlan: v.vlan, os: v.os_type,
            }))}
            filename="vms-export"
            columns={[
              { key: 'name', label: 'Name' }, { key: 'role', label: 'Role' },
              { key: 'vmid', label: 'VMID' }, { key: 'status', label: 'Status' },
              { key: 'ip', label: 'IP' }, { key: 'cpu', label: 'CPU' },
              { key: 'ram_gb', label: 'RAM GB' }, { key: 'disk_gb', label: 'Disk GB' },
              { key: 'vlan', label: 'VLAN' }, { key: 'os', label: 'OS' },
            ]}
          />
          <button onClick={() => setShowWizard(true)} className="btn-primary text-xs py-2 px-4">
            <Plus size={14} /> Create VM
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-nexgen-border/30" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-3.5 bg-nexgen-border/30 rounded w-28" />
                  <div className="h-2.5 bg-nexgen-border/20 rounded w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-nexgen-border/20 rounded w-full" />
                <div className="h-2 bg-nexgen-border/20 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vms.map((vm) => (
            <VMCard
              key={vm.id}
              vm={vm}
              acting={acting === vm.id}
              onAction={(action) => handleAction(vm.id, action)}
            />
          ))}
        </div>
      )}

      {!loading && vms.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Server size={40} className="text-nexgen-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-nexgen-text mb-2">No Virtual Machines</h3>
          <p className="text-xs text-nexgen-muted mb-4">
            {search ? `No VMs match "${search}"` : 'Connect Proxmox to sync inventory, or create a VM.'}
          </p>
          {!search && (
            <button onClick={() => setShowWizard(true)} className="btn-primary text-xs py-2 px-4">
              <Plus size={14} /> Create VM
            </button>
          )}
        </div>
      )}

      {showWizard && (
        <VMCreateWizard
          onClose={() => setShowWizard(false)}
          onCreated={() => { setShowWizard(false); refetch() }}
        />
      )}
    </div>
  )
}
