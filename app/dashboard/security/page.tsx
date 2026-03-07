'use client'

import { useCallback, useState } from 'react'
import { Shield, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getAlerts, resolveAlert } from '@/services/api'
import { clsx } from 'clsx'
import type { SecurityAlert } from '@/types'

const severityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-nexgen-red', bg: 'bg-nexgen-red/10 border-nexgen-red/30' },
  high: { color: 'text-nexgen-amber', bg: 'bg-nexgen-amber/10 border-nexgen-amber/30' },
  medium: { color: 'text-nexgen-accent', bg: 'bg-nexgen-accent/10 border-nexgen-accent/20' },
  low: { color: 'text-nexgen-blue', bg: 'bg-nexgen-blue/10 border-nexgen-blue/20' },
  info: { color: 'text-nexgen-muted', bg: 'bg-nexgen-card border-nexgen-border/30' },
}

export default function SecurityCenterPage() {
  const [showResolved, setShowResolved] = useState(false)
  const fetcher = useCallback(() => getAlerts(showResolved), [showResolved])
  const { data, loading, refetch } = useApi<SecurityAlert[]>(fetcher, 10000)
  const alerts = Array.isArray(data) ? data : []

  const handleResolve = async (id: string) => {
    await resolveAlert(id)
    refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <Shield size={22} className="text-nexgen-accent" />
          Security Center
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowResolved(false)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono transition-colors', !showResolved ? 'bg-nexgen-accent/20 text-nexgen-accent' : 'text-nexgen-muted hover:text-nexgen-text')}>Active</button>
          <button onClick={() => setShowResolved(true)} className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono transition-colors', showResolved ? 'bg-nexgen-accent/20 text-nexgen-accent' : 'text-nexgen-muted hover:text-nexgen-text')}>Resolved</button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="glass-card p-5 animate-pulse"><div className="h-4 bg-nexgen-border/30 rounded w-48" /></div>)}</div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const cfg = severityConfig[alert.severity] ?? severityConfig['info']!
            return (
              <div key={alert.id} className={clsx('glass-card p-5 border', cfg.bg)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className={clsx(cfg.color, 'mt-0.5')} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={clsx('text-xs font-bold uppercase', cfg.color)}>{alert.severity}</span>
                        <span className="text-[10px] text-nexgen-muted font-mono">{alert.source}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-nexgen-text mb-1">{alert.title}</h3>
                      {alert.description && <p className="text-xs text-nexgen-muted">{alert.description}</p>}
                      <p className="text-[10px] text-nexgen-muted mt-2">{new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  {!alert.resolved && (
                    <button onClick={() => handleResolve(alert.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-nexgen-green/10 text-nexgen-green text-xs hover:bg-nexgen-green/20 transition-colors shrink-0">
                      <CheckCircle2 size={12} /> Resolve
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {alerts.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Shield size={40} className="text-nexgen-green mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-nexgen-text mb-2">All Clear</h3>
              <p className="text-xs text-nexgen-muted">No {showResolved ? 'resolved' : 'active'} security alerts.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
