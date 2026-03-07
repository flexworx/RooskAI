'use client'

import { useCallback } from 'react'
import { Database, HardDrive, RefreshCw, Download } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getDatabases, triggerBackup } from '@/services/api'
import { clsx } from 'clsx'
import type { DatabaseInstance } from '@/types'

export default function DatabaseManagementPage() {
  const fetcher = useCallback(() => getDatabases(), [])
  const { data, loading, refetch } = useApi<DatabaseInstance[]>(fetcher, 15000)

  const databases = Array.isArray(data) ? data : []

  const handleBackup = async (id: string) => {
    try {
      await triggerBackup(id)
      refetch()
    } catch { /* error handled */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <Database size={22} className="text-nexgen-accent" />
          Database Management
        </h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <div key={i} className="glass-card p-6 animate-pulse"><div className="h-5 bg-nexgen-border/30 rounded w-40" /></div>)}
        </div>
      ) : (
        <div className="space-y-4">
          {databases.map((db) => {
            const connPct = db.connections_max > 0 ? (db.connections_active / db.connections_max) * 100 : 0
            return (
              <div key={db.id} className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Database size={18} className="text-nexgen-accent" />
                    <div>
                      <h3 className="text-sm font-mono font-semibold text-nexgen-text">{db.name}</h3>
                      <span className="text-[10px] text-nexgen-muted">{db.host}:{db.port}</span>
                    </div>
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-mono', db.role === 'primary' ? 'bg-nexgen-accent/20 text-nexgen-accent' : 'bg-nexgen-purple/20 text-nexgen-purple')}>{db.role}</span>
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-mono', db.status === 'running' ? 'bg-nexgen-green/20 text-nexgen-green' : 'bg-nexgen-red/20 text-nexgen-red')}>{db.status}</span>
                  </div>
                  <button onClick={() => handleBackup(db.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-nexgen-accent/10 text-nexgen-accent text-xs hover:bg-nexgen-accent/20 transition-colors">
                    <Download size={12} /> Backup
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="metric-label">Engine</div>
                    <div className="text-sm font-mono text-nexgen-text">{db.engine} {db.version}</div>
                  </div>
                  <div>
                    <div className="metric-label">Connections</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-nexgen-border/30 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full', connPct > 80 ? 'bg-nexgen-red' : connPct > 60 ? 'bg-nexgen-amber' : 'bg-nexgen-green')} style={{ width: `${connPct}%` }} />
                      </div>
                      <span className="text-xs font-mono text-nexgen-muted">{db.connections_active}/{db.connections_max}</span>
                    </div>
                  </div>
                  <div>
                    <div className="metric-label">Storage</div>
                    <div className="flex items-center gap-1 text-sm font-mono text-nexgen-text"><HardDrive size={12} className="text-nexgen-muted" />{db.storage_used_gb.toFixed(1)} GB</div>
                  </div>
                  <div>
                    <div className="metric-label">Replication Lag</div>
                    <div className="flex items-center gap-1 text-sm font-mono">
                      <RefreshCw size={12} className="text-nexgen-muted" />
                      {db.replication_lag_seconds !== null ? (
                        <span className={clsx((db.replication_lag_seconds ?? 0) > 60 ? 'text-nexgen-red' : 'text-nexgen-green')}>{db.replication_lag_seconds?.toFixed(1)}s</span>
                      ) : (
                        <span className="text-nexgen-muted">N/A</span>
                      )}
                    </div>
                  </div>
                </div>

                {db.last_backup && (
                  <div className="mt-3 pt-3 border-t border-nexgen-border/20 text-[10px] text-nexgen-muted">
                    Last backup: {new Date(db.last_backup).toLocaleString()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && databases.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Database size={40} className="text-nexgen-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-nexgen-text mb-2">No Databases Configured</h3>
          <p className="text-xs text-nexgen-muted">Provision PostgreSQL through the AI terminal or service catalog.</p>
        </div>
      )}
    </div>
  )
}
