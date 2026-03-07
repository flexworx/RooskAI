'use client'

import { DollarSign, TrendingDown, TrendingUp, Cpu, HardDrive, Zap } from 'lucide-react'
import { clsx } from 'clsx'

const monthlyCosts = [
  { month: 'Jan', compute: 420, storage: 85, network: 32, ai: 145 },
  { month: 'Feb', compute: 410, storage: 88, network: 35, ai: 162 },
  { month: 'Mar', compute: 395, storage: 90, network: 30, ai: 178 },
]

const resourceCosts = [
  { name: 'Dell R7625 (Power)', cost: 285, unit: '/mo', trend: -3, icon: Zap },
  { name: 'Compute (14 VMs)', cost: 395, unit: '/mo', trend: -4, icon: Cpu },
  { name: 'Storage (ZFS 11.5TB)', cost: 90, unit: '/mo', trend: 2, icon: HardDrive },
  { name: 'AWS Bedrock (AI)', cost: 178, unit: '/mo', trend: 10, icon: DollarSign },
  { name: 'Network (Cato SASE)', cost: 250, unit: '/mo', trend: 0, icon: DollarSign },
  { name: 'Monitoring (included)', cost: 0, unit: '/mo', trend: 0, icon: DollarSign },
]

const totalMonthly = resourceCosts.reduce((sum, r) => sum + r.cost, 0)
const annualized = totalMonthly * 12

export default function CostTrackingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
        <DollarSign size={22} className="text-nexgen-accent" />
        Cost Tracking
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-6 text-center">
          <p className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1">Monthly Total</p>
          <p className="text-3xl font-bold gradient-text">${totalMonthly.toLocaleString()}</p>
          <p className="text-xs text-nexgen-green mt-1 flex items-center justify-center gap-1">
            <TrendingDown size={12} /> 5% vs cloud equivalent
          </p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1">Annualized</p>
          <p className="text-3xl font-bold text-nexgen-text">${annualized.toLocaleString()}</p>
          <p className="text-xs text-nexgen-muted mt-1">Projected full year</p>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1">Cloud Savings</p>
          <p className="text-3xl font-bold text-nexgen-green">68%</p>
          <p className="text-xs text-nexgen-muted mt-1">vs equivalent AWS/Azure</p>
        </div>
      </div>

      {/* Resource breakdown */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-nexgen-text mb-4">Resource Breakdown</h3>
        <div className="space-y-3">
          {resourceCosts.map((r) => {
            const pct = totalMonthly > 0 ? (r.cost / totalMonthly) * 100 : 0
            return (
              <div key={r.name} className="flex items-center gap-4">
                <r.icon size={16} className="text-nexgen-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-nexgen-text">{r.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-nexgen-text">${r.cost}{r.unit}</span>
                      {r.trend !== 0 && (
                        <span className={clsx('text-[10px] flex items-center gap-0.5', r.trend > 0 ? 'text-nexgen-red' : 'text-nexgen-green')}>
                          {r.trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                          {Math.abs(r.trend)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-nexgen-border/20 rounded-full overflow-hidden">
                    <div className="h-full bg-nexgen-accent/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Monthly trend table */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-nexgen-text mb-4">Monthly Trend</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-nexgen-border/20">
              <th className="text-left px-3 py-2 text-nexgen-muted">Month</th>
              <th className="text-right px-3 py-2 text-nexgen-muted">Compute</th>
              <th className="text-right px-3 py-2 text-nexgen-muted">Storage</th>
              <th className="text-right px-3 py-2 text-nexgen-muted">Network</th>
              <th className="text-right px-3 py-2 text-nexgen-muted">AI/LLM</th>
              <th className="text-right px-3 py-2 text-nexgen-muted font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {monthlyCosts.map((m) => (
              <tr key={m.month} className="border-b border-nexgen-border/10">
                <td className="px-3 py-2.5 font-mono text-nexgen-text">{m.month} 2026</td>
                <td className="px-3 py-2.5 text-right font-mono text-nexgen-muted">${m.compute}</td>
                <td className="px-3 py-2.5 text-right font-mono text-nexgen-muted">${m.storage}</td>
                <td className="px-3 py-2.5 text-right font-mono text-nexgen-muted">${m.network}</td>
                <td className="px-3 py-2.5 text-right font-mono text-nexgen-muted">${m.ai}</td>
                <td className="px-3 py-2.5 text-right font-mono font-semibold text-nexgen-text">${m.compute + m.storage + m.network + m.ai}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
