'use client'

import { Cpu, MemoryStick, HardDrive, Wifi } from 'lucide-react'
import type { SystemMetrics } from '@/types'

interface Props {
  metrics: SystemMetrics | null
}

function MetricGauge({ label, value, max, unit, icon: Icon, color }: {
  label: string
  value: number
  max: number
  unit: string
  icon: typeof Cpu
  color: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  const barColor = pct > 90 ? 'bg-nexgen-red' : pct > 70 ? 'bg-nexgen-amber' : color

  return (
    <div className="glass-card p-4 flex-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className="text-nexgen-accent" />
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">{value.toFixed(1)}{unit}</div>
      <div className="mt-2 h-1.5 bg-nexgen-border/30 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-nexgen-muted font-mono">
        {pct.toFixed(0)}% of {max}{unit}
      </div>
    </div>
  )
}

export function SystemHealthBar({ metrics }: Props) {
  if (!metrics || Array.isArray(metrics) || typeof metrics.cpu_percent !== 'number') {
    return (
      <div className="flex gap-4 flex-wrap">
        {['CPU', 'RAM', 'Storage', 'Network'].map((label) => (
          <div key={label} className="glass-card p-4 flex-1 min-w-[180px] animate-pulse">
            <div className="h-4 bg-nexgen-border/30 rounded w-16 mb-3" />
            <div className="h-6 bg-nexgen-border/30 rounded w-20" />
            <p className="text-[10px] text-nexgen-muted mt-2">{label} — waiting for backend</p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 flex-wrap">
      <MetricGauge label="CPU" value={metrics.cpu_percent ?? 0} max={100} unit="%" icon={Cpu} color="bg-nexgen-accent" />
      <MetricGauge label="RAM" value={metrics.ram_used_gb ?? 0} max={metrics.ram_total_gb ?? 1} unit="GB" icon={MemoryStick} color="bg-nexgen-blue" />
      <MetricGauge label="Storage" value={(metrics.storage_used_gb ?? 0) / 1000} max={(metrics.storage_total_gb ?? 1) / 1000} unit="TB" icon={HardDrive} color="bg-nexgen-purple" />
      <MetricGauge label="Network" value={(metrics.network_rx_mbps ?? 0) + (metrics.network_tx_mbps ?? 0)} max={1000} unit="Mbps" icon={Wifi} color="bg-nexgen-green" />
    </div>
  )
}
