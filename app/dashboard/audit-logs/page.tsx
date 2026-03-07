'use client'

import { useCallback, useState } from 'react'
import { FileText, Download, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getComplianceLogs } from '@/services/api'
import { clsx } from 'clsx'
import type { AuditLogEntry } from '@/types'

const PAGE_SIZE = 25

const outcomeStyles: Record<string, string> = {
  success: 'bg-nexgen-green/10 text-nexgen-green',
  failure: 'bg-nexgen-red/10 text-nexgen-red',
  error: 'bg-nexgen-red/10 text-nexgen-red',
  denied: 'bg-nexgen-amber/10 text-nexgen-amber',
}

export default function AuditLogsPage() {
  const [page, setPage] = useState(0)
  const [filterAction, setFilterAction] = useState('')
  const fetcher = useCallback(() => getComplianceLogs(PAGE_SIZE, page * PAGE_SIZE), [page])
  const { data, loading } = useApi<AuditLogEntry[]>(fetcher)

  const logs = Array.isArray(data) ? data : []
  const filtered = filterAction
    ? logs.filter((l) => l.action.toLowerCase().includes(filterAction.toLowerCase()))
    : logs

  const exportCSV = () => {
    const headers = ['timestamp', 'action', 'user_id', 'agent_id', 'resource_type', 'resource_id', 'outcome', 'ip_address']
    const rows = filtered.map((l) =>
      headers.map((h) => JSON.stringify(l[h as keyof AuditLogEntry] ?? '')).join(','),
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <FileText size={22} className="text-nexgen-accent" />
          Audit Logs
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexgen-muted" />
            <input
              type="text"
              placeholder="Filter by action..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="pl-8 pr-4 py-2 bg-nexgen-bg border border-nexgen-border/40 rounded-lg text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60 w-48"
            />
          </div>
          <button onClick={exportCSV} className="btn-secondary text-xs py-2 px-4">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Log table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-nexgen-border/20">
                <th className="text-left px-4 py-3 text-nexgen-muted font-medium uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-4 py-3 text-nexgen-muted font-medium uppercase tracking-wider">Action</th>
                <th className="text-left px-4 py-3 text-nexgen-muted font-medium uppercase tracking-wider">User / Agent</th>
                <th className="text-left px-4 py-3 text-nexgen-muted font-medium uppercase tracking-wider">Resource</th>
                <th className="text-left px-4 py-3 text-nexgen-muted font-medium uppercase tracking-wider">Outcome</th>
                <th className="text-left px-4 py-3 text-nexgen-muted font-medium uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-nexgen-border/10 animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-3 bg-nexgen-border/20 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-nexgen-muted">
                    No audit log entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="border-b border-nexgen-border/10 hover:bg-nexgen-card/20 transition-colors">
                    <td className="px-4 py-3 text-nexgen-muted font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-nexgen-text font-mono">{log.action}</td>
                    <td className="px-4 py-3 text-nexgen-muted font-mono">
                      {log.user_id ? `user:${log.user_id.slice(0, 8)}` : log.agent_id ? `agent:${log.agent_id.slice(0, 8)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-nexgen-muted font-mono">
                      {log.resource_type ? `${log.resource_type}/${log.resource_id?.slice(0, 8) ?? ''}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-mono', outcomeStyles[log.outcome] ?? 'bg-nexgen-card text-nexgen-muted')}>
                        {log.outcome}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-nexgen-muted font-mono">{log.ip_address ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-nexgen-border/20">
          <span className="text-[10px] text-nexgen-muted">
            Page {page + 1} &middot; {filtered.length} entries
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-nexgen-card transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={14} className="text-nexgen-muted" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={logs.length < PAGE_SIZE}
              className="p-1.5 rounded-lg hover:bg-nexgen-card transition-colors disabled:opacity-30"
            >
              <ChevronRight size={14} className="text-nexgen-muted" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
