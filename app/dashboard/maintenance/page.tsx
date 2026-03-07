'use client'

import { useState } from 'react'
import { CalendarClock, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'

interface MaintenanceWindow {
  id: string
  title: string
  description: string
  start: string
  end: string
  affected: string[]
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  created_by: string
}

const windows: MaintenanceWindow[] = [
  { id: '1', title: 'Proxmox Kernel Update', description: 'Security patch for hypervisor kernel', start: '2026-03-15T02:00:00Z', end: '2026-03-15T04:00:00Z', affected: ['All VMs (rolling restart)'], status: 'scheduled', created_by: 'Brendan Murphy' },
  { id: '2', title: 'PostgreSQL Major Version Upgrade', description: 'Upgrade from PG 16.2 to 16.4', start: '2026-03-20T01:00:00Z', end: '2026-03-20T03:00:00Z', affected: ['VM-DB-01', 'VM-DB-02'], status: 'scheduled', created_by: 'Brendan Murphy' },
  { id: '3', title: 'Network Switch Firmware', description: 'Firmware update on management switch', start: '2026-03-01T03:00:00Z', end: '2026-03-01T03:30:00Z', affected: ['Management VLAN (brief outage)'], status: 'completed', created_by: 'Brendan Murphy' },
]

const statusConfig = {
  scheduled: { color: 'text-nexgen-blue', bg: 'bg-nexgen-blue/10', icon: Clock },
  in_progress: { color: 'text-nexgen-amber', bg: 'bg-nexgen-amber/10', icon: AlertCircle },
  completed: { color: 'text-nexgen-green', bg: 'bg-nexgen-green/10', icon: CheckCircle2 },
  cancelled: { color: 'text-nexgen-muted', bg: 'bg-nexgen-card', icon: Clock },
}

export default function MaintenancePage() {
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'completed'>('all')
  const filtered = filter === 'all' ? windows : windows.filter((w) => w.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <CalendarClock size={22} className="text-nexgen-accent" />
          Maintenance Windows
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {(['all', 'scheduled', 'completed'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono transition-colors', filter === f ? 'bg-nexgen-accent/20 text-nexgen-accent' : 'text-nexgen-muted hover:text-nexgen-text')}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <button className="btn-primary text-xs py-2 px-4"><Plus size={14} /> Schedule</button>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {filtered.map((w) => {
          const cfg = statusConfig[w.status]
          const StatusIcon = cfg.icon
          const start = new Date(w.start)
          const end = new Date(w.end)
          const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

          return (
            <div key={w.id} className="glass-card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', cfg.bg)}>
                    <StatusIcon size={16} className={cfg.color} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-nexgen-text">{w.title}</h3>
                    <p className="text-xs text-nexgen-muted mt-0.5">{w.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-[10px] text-nexgen-muted font-mono">
                      <span>{start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>→</span>
                      <span>{end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="px-1.5 py-0.5 rounded bg-nexgen-card">{duration}min</span>
                    </div>
                  </div>
                </div>
                <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-mono', cfg.bg, cfg.color)}>
                  {w.status.replace('_', ' ')}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-nexgen-border/10 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {w.affected.map((a) => (
                    <span key={a} className="px-2 py-0.5 rounded-full bg-nexgen-card text-[10px] text-nexgen-muted font-mono">{a}</span>
                  ))}
                </div>
                <span className="text-[10px] text-nexgen-muted">by {w.created_by}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
