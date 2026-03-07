'use client'

import { ShieldAlert, AlertTriangle, Info } from 'lucide-react'
import { clsx } from 'clsx'
import type { SecurityAlert } from '@/types'

interface Props {
  alerts: SecurityAlert[]
}

const severityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-nexgen-red', bg: 'bg-nexgen-red/10 border-nexgen-red/30' },
  high: { color: 'text-nexgen-amber', bg: 'bg-nexgen-amber/10 border-nexgen-amber/30' },
  medium: { color: 'text-nexgen-accent', bg: 'bg-nexgen-accent/10 border-nexgen-accent/20' },
  low: { color: 'text-nexgen-blue', bg: 'bg-nexgen-blue/10 border-nexgen-blue/20' },
  info: { color: 'text-nexgen-muted', bg: 'bg-nexgen-card border-nexgen-border/30' },
}

export function SecurityAlertsPanel({ alerts }: Props) {
  const activeAlerts = alerts.filter((a) => !a.resolved)
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert size={16} className="text-nexgen-accent" />
        <h3 className="text-sm font-semibold text-nexgen-text">Security Alerts</h3>
        {activeAlerts.length > 0 && <span className="ml-auto px-2 py-0.5 bg-nexgen-red/20 text-nexgen-red text-xs font-mono rounded-full">{activeAlerts.length} active</span>}
      </div>
      <div className="space-y-2 max-h-[250px] overflow-y-auto">
        {activeAlerts.map((alert) => {
          const cfg = severityConfig[alert.severity] ?? severityConfig['info']!
          return (
            <div key={alert.id} className={clsx('border rounded-lg p-3', cfg.bg)}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className={clsx(cfg.color, 'mt-0.5 shrink-0')} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={clsx('text-xs font-bold uppercase', cfg.color)}>{alert.severity}</span>
                    <span className="text-[10px] text-nexgen-muted">{alert.source}</span>
                  </div>
                  <p className="text-xs text-nexgen-text">{alert.title}</p>
                  <p className="text-[10px] text-nexgen-muted mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )
        })}
        {activeAlerts.length === 0 && <div className="text-center py-6 text-nexgen-green text-sm flex items-center justify-center gap-2"><Info size={14} />No active security alerts</div>}
      </div>
    </div>
  )
}
