'use client'

import { useCallback } from 'react'
import { FileCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getComplianceSummary } from '@/services/api'
import { clsx } from 'clsx'
import type { ComplianceSummary } from '@/types'

const statusIcon: Record<string, typeof CheckCircle2> = {
  implemented: CheckCircle2,
  attention_needed: AlertTriangle,
  not_implemented: XCircle,
}

const statusColor: Record<string, string> = {
  implemented: 'text-nexgen-green',
  attention_needed: 'text-nexgen-amber',
  not_implemented: 'text-nexgen-red',
}

export default function CompliancePage() {
  const fetcher = useCallback(() => getComplianceSummary(), [])
  const { data, loading } = useApi<ComplianceSummary>(fetcher, 30000)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
        <FileCheck size={22} className="text-nexgen-accent" />
        Compliance
      </h1>

      {/* Score Card */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="glass-card p-5 text-center">
            <div className="metric-label mb-2">Compliance Score</div>
            <div className={clsx('text-3xl font-bold font-mono', data.compliance_score >= 90 ? 'text-nexgen-green' : data.compliance_score >= 70 ? 'text-nexgen-amber' : 'text-nexgen-red')}>
              {data.compliance_score}%
            </div>
          </div>
          <div className="glass-card p-5 text-center">
            <div className="metric-label mb-2">Total Controls</div>
            <div className="metric-value">{data.total_controls}</div>
          </div>
          <div className="glass-card p-5 text-center">
            <div className="metric-label mb-2">Passing</div>
            <div className="text-2xl font-bold font-mono text-nexgen-green">{data.passing}</div>
          </div>
          <div className="glass-card p-5 text-center">
            <div className="metric-label mb-2">Attention Needed</div>
            <div className="text-2xl font-bold font-mono text-nexgen-amber">{data.attention_needed}</div>
          </div>
        </div>
      )}

      {/* Frameworks */}
      {data?.frameworks && (
        <div className="flex gap-2">
          {data.frameworks.map((fw) => (
            <span key={fw} className="text-xs font-mono px-3 py-1 rounded-full border border-nexgen-accent/30 bg-nexgen-accent/5 text-nexgen-accent">{fw}</span>
          ))}
        </div>
      )}

      {/* Controls Table */}
      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-nexgen-border/30 bg-nexgen-surface/50">
          <div className="col-span-1 text-[10px] font-semibold text-nexgen-muted uppercase">Status</div>
          <div className="col-span-2 text-[10px] font-semibold text-nexgen-muted uppercase">ID</div>
          <div className="col-span-2 text-[10px] font-semibold text-nexgen-muted uppercase">Domain</div>
          <div className="col-span-4 text-[10px] font-semibold text-nexgen-muted uppercase">Description</div>
          <div className="col-span-3 text-[10px] font-semibold text-nexgen-muted uppercase">Evidence</div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-nexgen-muted text-sm animate-pulse">Loading compliance data...</div>
        ) : (
          (data?.controls ?? []).map((ctrl, i) => {
            const Icon = statusIcon[ctrl.status] ?? AlertTriangle
            const color = statusColor[ctrl.status] ?? 'text-nexgen-muted'
            return (
              <div key={ctrl.id} className={`grid grid-cols-12 gap-4 px-5 py-3 ${i < (data?.controls.length ?? 0) - 1 ? 'border-b border-nexgen-border/20' : ''}`}>
                <div className="col-span-1 flex items-center"><Icon size={14} className={color} /></div>
                <div className="col-span-2 text-xs font-mono text-nexgen-text">{ctrl.id}</div>
                <div className="col-span-2 text-xs text-nexgen-muted">{ctrl.domain}</div>
                <div className="col-span-4 text-xs text-nexgen-text">{ctrl.description}</div>
                <div className="col-span-3 text-[10px] text-nexgen-muted font-mono">{ctrl.evidence}</div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
