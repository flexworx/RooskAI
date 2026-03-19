'use client'

import { useCallback } from 'react'
import { Activity, Cpu, MemoryStick, HardDrive, Wifi } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getSystemMetrics, getHealth } from '@/services/api'
import type { SystemMetrics, PlatformHealth } from '@/types'

export default function MonitoringPage() {
  const metricsFetcher = useCallback(() => getSystemMetrics(), [])
  const healthFetcher = useCallback(() => getHealth(), [])
  const { data: metrics } = useApi<SystemMetrics>(metricsFetcher, 5000)
  const { data: health } = useApi<PlatformHealth>(healthFetcher, 10000)

  const m = metrics && !Array.isArray(metrics) && typeof metrics.cpu_percent === 'number' ? metrics : null

  const rxMbps = m?.network_rx_mbps ?? 0
  const txMbps = m?.network_tx_mbps ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
        <Activity size={22} className="text-nexgen-accent" />
        Monitoring
      </h1>

      {/* System Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'CPU', value: m ? `${(m.cpu_percent ?? 0).toFixed(1)}%` : '—', sub: m?.cpu_model ?? '', icon: Cpu, pct: m?.cpu_percent ?? 0 },
          { label: 'RAM', value: m ? `${(m.ram_used_gb ?? 0).toFixed(1)} / ${(m.ram_total_gb ?? 0).toFixed(0)} GB` : '—', sub: m && m.ram_total_gb ? `${((m.ram_used_gb / m.ram_total_gb) * 100).toFixed(0)}% used` : '', icon: MemoryStick, pct: m && m.ram_total_gb ? (m.ram_used_gb / m.ram_total_gb) * 100 : 0 },
          { label: 'Storage', value: m ? `${((m.storage_used_gb ?? 0) / 1000).toFixed(1)} / ${((m.storage_total_gb ?? 0) / 1000).toFixed(1)} TB` : '—', sub: m && m.storage_total_gb ? `${((m.storage_used_gb / m.storage_total_gb) * 100).toFixed(0)}% used` : '', icon: HardDrive, pct: m && m.storage_total_gb ? (m.storage_used_gb / m.storage_total_gb) * 100 : 0 },
          { label: 'Network', value: m ? `${(rxMbps + txMbps).toFixed(1)} Mbps` : '—', sub: m ? `RX: ${rxMbps.toFixed(1)} / TX: ${txMbps.toFixed(1)} Mbps` : '', icon: Wifi, pct: 0 },
        ].map((item) => (
          <div key={item.label} className="glass-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <item.icon size={16} className="text-nexgen-accent" />
              <span className="metric-label">{item.label}</span>
            </div>
            <div className="text-lg font-bold font-mono text-nexgen-accent mb-1">{item.value}</div>
            {item.pct > 0 && (
              <div className="h-1.5 bg-nexgen-border/30 rounded-full overflow-hidden mb-1">
                <div className={`h-full rounded-full transition-all duration-500 ${item.pct > 90 ? 'bg-nexgen-red' : item.pct > 70 ? 'bg-nexgen-amber' : 'bg-nexgen-accent'}`} style={{ width: `${Math.min(item.pct, 100)}%` }} />
              </div>
            )}
            <div className="text-[10px] text-nexgen-muted font-mono">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Service Health */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-nexgen-text mb-4">Service Health</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(health?.services ?? []).map((svc) => (
            <div key={svc.name} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-nexgen-bg/30">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${svc.status === 'healthy' ? 'bg-nexgen-green' : svc.status === 'deferred' ? 'bg-nexgen-purple' : 'bg-nexgen-red'}`} />
              <div className="flex-1">
                <span className="text-xs font-mono text-nexgen-text">{svc.name}</span>
              </div>
              <span className="text-[10px] font-mono text-nexgen-muted">{svc.latency_ms !== null ? `${svc.latency_ms}ms` : svc.status}</span>
            </div>
          ))}
          {(!health || health.services.length === 0) && <div className="col-span-full text-center py-6 text-nexgen-muted text-sm">Waiting for health data...</div>}
        </div>
      </div>

      {/* Uptime */}
      {m?.uptime_seconds && (
        <div className="glass-card p-5">
          <div className="metric-label mb-1">System Uptime</div>
          <div className="text-lg font-mono text-nexgen-accent">
            {Math.floor(m.uptime_seconds / 86400)}d {Math.floor((m.uptime_seconds % 86400) / 3600)}h {Math.floor((m.uptime_seconds % 3600) / 60)}m
          </div>
        </div>
      )}
    </div>
  )
}
