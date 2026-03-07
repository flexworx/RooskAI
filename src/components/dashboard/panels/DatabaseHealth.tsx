'use client'

import { Database, HardDrive, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import type { DatabaseInstance } from '@/types'

interface Props {
  databases: DatabaseInstance[]
}

export function DatabaseHealth({ databases }: Props) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Database size={16} className="text-nexgen-accent" />
        <h3 className="text-sm font-semibold text-nexgen-text">Database Health</h3>
      </div>
      <div className="space-y-3">
        {databases.map((db) => {
          const connPct = db.connections_max > 0 ? (db.connections_active / db.connections_max) * 100 : 0
          return (
            <div key={db.id} className="bg-nexgen-bg/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium text-nexgen-text">{db.name}</span>
                  <span className={clsx('text-[10px] px-1.5 py-0.5 rounded', db.role === 'primary' ? 'bg-nexgen-accent/20 text-nexgen-accent' : 'bg-nexgen-purple/20 text-nexgen-purple')}>{db.role}</span>
                </div>
                <span className={clsx('text-[10px] font-mono', db.status === 'running' ? 'text-nexgen-green' : 'text-nexgen-red')}>{db.engine} {db.version}</span>
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] text-nexgen-muted w-16">Connections</span>
                <div className="flex-1 h-1.5 bg-nexgen-border/30 rounded-full overflow-hidden">
                  <div className={clsx('h-full rounded-full', connPct > 80 ? 'bg-nexgen-red' : connPct > 60 ? 'bg-nexgen-amber' : 'bg-nexgen-green')} style={{ width: `${connPct}%` }} />
                </div>
                <span className="text-[10px] text-nexgen-muted font-mono w-12 text-right">{db.connections_active}/{db.connections_max}</span>
              </div>
              {db.replication_lag_seconds !== null && (
                <div className="flex items-center gap-2 text-[10px]">
                  <RefreshCw size={10} className="text-nexgen-muted" />
                  <span className={clsx('font-mono', (db.replication_lag_seconds ?? 0) > 60 ? 'text-nexgen-red' : 'text-nexgen-green')}>Rep lag: {db.replication_lag_seconds?.toFixed(1)}s</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-[10px] mt-1">
                <HardDrive size={10} className="text-nexgen-muted" />
                <span className="font-mono text-nexgen-muted">{db.storage_used_gb.toFixed(1)}GB used</span>
              </div>
            </div>
          )
        })}
        {databases.length === 0 && <div className="text-center py-6 text-nexgen-muted text-sm">No databases configured</div>}
      </div>
    </div>
  )
}
