'use client'

import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import type { AuditLogEntry } from '@/types'

interface Props {
  logs: AuditLogEntry[]
}

const outcomeIcon: Record<string, typeof CheckCircle> = {
  success: CheckCircle,
  failure: XCircle,
  pending: AlertTriangle,
}

const outcomeColor: Record<string, string> = {
  success: 'text-nexgen-green',
  failure: 'text-nexgen-red',
  pending: 'text-nexgen-amber',
}

export function RecentActivity({ logs }: Props) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={16} className="text-nexgen-accent" />
        <h3 className="text-sm font-semibold text-nexgen-text">Recent Activity</h3>
        <span className="ml-auto text-xs text-nexgen-muted font-mono">Last {logs.length}</span>
      </div>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {logs.map((log) => {
          const Icon = outcomeIcon[log.outcome] ?? AlertTriangle
          const color = outcomeColor[log.outcome] ?? 'text-nexgen-muted'
          return (
            <div key={log.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-nexgen-bg/30 hover:bg-nexgen-bg/50 transition-colors">
              <Icon size={14} className={color} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-nexgen-text truncate">{log.action}</p>
                <p className="text-[10px] text-nexgen-muted">{log.resource_type && `${log.resource_type} · `}{log.agent_id ? `Agent: ${log.agent_id}` : 'Manual'}</p>
              </div>
              <span className="text-[10px] text-nexgen-muted font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</span>
            </div>
          )
        })}
        {logs.length === 0 && <div className="text-center py-6 text-nexgen-muted text-sm">No recent activity</div>}
      </div>
    </div>
  )
}
