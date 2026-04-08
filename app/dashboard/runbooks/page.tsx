'use client'

import { useCallback, useState } from 'react'
import { PlayCircle, Plus, Clock, CheckCircle2, AlertTriangle, Zap, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getRunbooks, executeRunbook, createRunbook, deleteRunbook } from '@/services/api'
import { clsx } from 'clsx'
import type { Runbook } from '@/types'

const triggerIcons = {
  manual: PlayCircle,
  alert: AlertTriangle,
  schedule: Clock,
  threshold: Zap,
}
const triggerColors = {
  manual: 'text-nexgen-accent',
  alert: 'text-nexgen-red',
  schedule: 'text-nexgen-blue',
  threshold: 'text-nexgen-amber',
}

function statusClass(status: string) {
  if (status === 'ready') return 'bg-nexgen-green/10 text-nexgen-green'
  if (status === 'running') return 'bg-nexgen-accent/10 text-nexgen-accent'
  if (status === 'completed') return 'bg-nexgen-blue/10 text-nexgen-blue'
  return 'bg-nexgen-red/10 text-nexgen-red'
}

export default function RunbooksPage() {
  const fetcher = useCallback(() => getRunbooks(), [])
  const { data, loading, refetch } = useApi<Runbook[]>(fetcher)
  const runbooks = Array.isArray(data) ? data : []

  const [expanded, setExpanded] = useState<string | null>(null)
  const [executing, setExecuting] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Create form state
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTrigger, setNewTrigger] = useState('manual')
  const [creating, setCreating] = useState(false)

  const handleExecute = async (id: string, name: string) => {
    setExecuting(id)
    setMessage(null)
    try {
      const res = await executeRunbook(id)
      setMessage({ type: 'success', text: res.message || `Runbook '${name}' executed successfully.` })
      refetch()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Execution failed' })
    }
    setExecuting(null)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await deleteRunbook(id)
      refetch()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' })
    }
    setDeleting(null)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    try {
      await createRunbook({ name: newName.trim(), description: newDesc.trim() || undefined, trigger: newTrigger, steps: [] })
      setNewName('')
      setNewDesc('')
      setNewTrigger('manual')
      setShowCreate(false)
      refetch()
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Create failed' })
    }
    setCreating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <PlayCircle size={22} className="text-nexgen-accent" />
          Runbooks
        </h1>
        <button onClick={() => setShowCreate((v) => !v)} className="btn-primary text-xs py-2 px-4">
          <Plus size={14} /> Create Runbook
        </button>
      </div>

      {message && (
        <div className={clsx('glass-card p-3 text-xs font-mono border',
          message.type === 'success' ? 'border-nexgen-green/30 text-nexgen-green bg-nexgen-green/5' : 'border-nexgen-red/30 text-nexgen-red bg-nexgen-red/5'
        )}>
          {message.text}
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-nexgen-text">New Runbook</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-nexgen-muted mb-1">Name *</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. High CPU Response"
                className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
              />
            </div>
            <div>
              <label className="block text-xs text-nexgen-muted mb-1">Trigger</label>
              <select
                value={newTrigger}
                onChange={(e) => setNewTrigger(e.target.value)}
                className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
              >
                <option value="manual">Manual</option>
                <option value="alert">Alert</option>
                <option value="schedule">Schedule</option>
                <option value="threshold">Threshold</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">Description</label>
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="What does this runbook do?"
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={creating || !newName.trim()} className="btn-primary text-xs py-2 px-4 disabled:opacity-50">
              {creating ? <><Loader2 size={12} className="animate-spin" /> Creating...</> : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="text-xs px-4 py-2 rounded-lg border border-nexgen-border/40 text-nexgen-muted hover:text-nexgen-text transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-nexgen-border/30 rounded w-48 mb-2" />
              <div className="h-3 bg-nexgen-border/20 rounded w-72" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {runbooks.map((rb) => {
            const TriggerIcon = triggerIcons[rb.trigger as keyof typeof triggerIcons] ?? PlayCircle
            const isExpanded = expanded === rb.id
            const isExecuting = executing === rb.id
            const isDeleting = deleting === rb.id

            return (
              <div key={rb.id} className="glass-card overflow-hidden">
                <div className="p-5 flex items-center justify-between">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : rb.id)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    <TriggerIcon size={18} className={triggerColors[rb.trigger as keyof typeof triggerColors] ?? 'text-nexgen-muted'} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-nexgen-text truncate">{rb.name}</h3>
                      {rb.description && (
                        <p className="text-xs text-nexgen-muted truncate">{rb.description}</p>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-mono', statusClass(rb.status))}>
                      {rb.status}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-nexgen-card text-nexgen-muted font-mono">
                      {rb.trigger}
                    </span>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : rb.id)}
                      className="p-1 text-nexgen-muted hover:text-nexgen-text transition-colors"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-nexgen-border/10 pt-4 space-y-4">
                    {rb.steps && rb.steps.length > 0 ? (
                      <div className="space-y-2">
                        {rb.steps.map((step, i) => (
                          <div key={step.id} className="flex items-start gap-3">
                            <span className="w-6 h-6 rounded-full bg-nexgen-accent/10 text-nexgen-accent text-[10px] font-mono flex items-center justify-center flex-shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <div className="flex-1">
                              <span className="text-xs text-nexgen-text">{step.action}</span>
                              {step.target && (
                                <span className="text-[10px] text-nexgen-muted ml-2">→ {step.target}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-nexgen-muted italic">No steps defined. Edit this runbook to add steps.</p>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-nexgen-muted">
                        Last run: {rb.last_run ? new Date(rb.last_run).toLocaleString() : 'Never'}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDelete(rb.id)}
                          disabled={isDeleting}
                          className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-lg border border-nexgen-red/20 text-nexgen-red hover:bg-nexgen-red/10 transition-colors disabled:opacity-50"
                        >
                          {isDeleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                          Delete
                        </button>
                        <button
                          onClick={() => handleExecute(rb.id, rb.name)}
                          disabled={isExecuting || rb.status === 'running'}
                          className="flex items-center gap-1 btn-primary text-xs py-1.5 px-4 disabled:opacity-50"
                        >
                          {isExecuting ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
                          Execute
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && runbooks.length === 0 && (
        <div className="glass-card p-12 text-center">
          <PlayCircle size={40} className="text-nexgen-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-nexgen-text mb-2">No Runbooks Yet</h3>
          <p className="text-xs text-nexgen-muted mb-4">
            Create a runbook to automate common infrastructure tasks.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-xs py-2 px-4">
            <Plus size={14} /> Create Your First Runbook
          </button>
        </div>
      )}
    </div>
  )
}
