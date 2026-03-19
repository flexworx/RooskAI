'use client'

import { useCallback, useState } from 'react'
import {
  Brain, Inbox, Clock, Users, Zap, MessageSquare, Mail, Phone,
  CheckCircle2, AlertTriangle, ArrowRight, Send, Archive, Trash2,
  Loader2, RefreshCw, Plus, X, ChevronRight, Edit3,
  RotateCcw, Shield, Server, Database, Network, Monitor, Activity, Bot,
  Copy, ExternalLink,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import {
  getDCOSMessages, getDCOSStats, getDCOSBriefings,
  ingestDCOSMessage, executeDCOSAction, archiveDCOSMessage, deleteDCOSMessage,
  generateDCOSBriefing, triageDCOSMessage, updateDCOSDecision,
} from '@/services/api'
import { clsx } from 'clsx'
import type { QCMessage, DCOSStats, DCOSBriefing } from '@/types'

// --- Lookups ---
const channelIcons: Record<string, typeof Mail> = {
  email: Mail, slack: MessageSquare, teams: Users, sms: Phone, voice: Phone, platform: Zap,
}
const tierColors: Record<string, string> = {
  P0: 'bg-nexgen-red text-white', P1: 'bg-nexgen-amber/80 text-white',
  P2: 'bg-nexgen-blue/80 text-white', P3: 'bg-nexgen-muted/30 text-nexgen-muted',
}
const tierBorder: Record<string, string> = {
  P0: 'border-l-nexgen-red', P1: 'border-l-nexgen-amber', P2: 'border-l-nexgen-blue', P3: 'border-l-nexgen-border',
}
const actionLabels: Record<string, string> = {
  respond_now: 'Respond Now', defer: 'Defer', delegate: 'Delegate',
  archive: 'Archive', escalate: 'Escalate',
}
const actionColors: Record<string, string> = {
  respond_now: 'text-nexgen-red bg-nexgen-red/10 border-nexgen-red/20',
  defer: 'text-nexgen-blue bg-nexgen-blue/10 border-nexgen-blue/20',
  delegate: 'text-nexgen-amber bg-nexgen-amber/10 border-nexgen-amber/20',
  archive: 'text-nexgen-muted bg-nexgen-muted/10 border-nexgen-border/20',
  escalate: 'text-nexgen-red bg-nexgen-red/10 border-nexgen-red/20',
}
const agentIcons: Record<string, typeof Bot> = {
  'murph-generic': Bot, 'murph-infrastructure': Server, 'murph-security': Shield,
  'murph-database': Database, 'murph-networking': Network, 'murph-daas': Monitor,
  'murph-monitoring': Activity,
}
const allActions = ['respond_now', 'defer', 'delegate', 'archive', 'escalate'] as const

// --- Page ---
export default function ChiefOfStaffPage() {
  const [filter, setFilter] = useState<'all' | 'P0' | 'P1' | 'P2' | 'P3'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [showCompose, setShowCompose] = useState(false)
  const [briefingLoading, setBriefingLoading] = useState(false)

  const msgFetcher = useCallback(() => getDCOSMessages({ limit: 100 }), [])
  const statsFetcher = useCallback(() => getDCOSStats(), [])
  const briefingFetcher = useCallback(() => getDCOSBriefings('daily'), [])

  const { data: msgData, refetch: refetchMsgs } = useApi<{ messages: QCMessage[]; total: number }>(msgFetcher, 10000)
  const { data: statsData } = useApi<DCOSStats>(statsFetcher, 15000)
  const { data: briefingData, refetch: refetchBriefings } = useApi<{ briefings: DCOSBriefing[] }>(briefingFetcher, 60000)

  const messages = msgData?.messages ?? []
  const stats = statsData && typeof statsData === 'object' && 'total_messages' in statsData ? statsData : null
  const latestBriefing = briefingData?.briefings?.[0] ?? null

  const filtered = filter === 'all' ? messages : messages.filter((m) => m.priority?.tier === filter)
  const selected = selectedId ? messages.find((m) => m.id === selectedId) ?? null : null
  const tierCount = (t: string) => messages.filter((m) => m.priority?.tier === t).length

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusy(p => ({ ...p, [id]: true }))
    try { await fn() } finally { setBusy(p => ({ ...p, [id]: false })); refetchMsgs() }
  }

  const handleGenerateBriefing = async () => {
    setBriefingLoading(true)
    try { await generateDCOSBriefing('daily', 24); refetchBriefings() } finally { setBriefingLoading(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <Brain size={22} className="text-nexgen-accent" />
          Digital Chief of Staff
        </h1>
        <div className="flex items-center gap-2 text-xs">
          <button onClick={() => setShowCompose(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexgen-accent/10 text-nexgen-accent hover:bg-nexgen-accent/20 transition-colors font-mono">
            <Plus size={12} /> Ingest
          </button>
          <button onClick={handleGenerateBriefing} disabled={briefingLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nexgen-accent/10 text-nexgen-accent hover:bg-nexgen-accent/20 transition-colors font-mono disabled:opacity-40">
            {briefingLoading ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />} Briefing
          </button>
          <span className="px-2 py-1 rounded-full bg-nexgen-green/10 text-nexgen-green font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-nexgen-green animate-pulse" /> Live
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Inbox', value: stats?.total_messages ?? '—', sub: `${stats?.pending ?? 0} pending`, color: 'gradient-text' },
          { label: 'Critical', value: stats?.p0_count ?? 0, sub: 'P0 items', color: 'text-nexgen-red' },
          { label: 'Avg QPS', value: stats?.avg_qps ?? '—', sub: 'priority score', color: 'text-nexgen-text' },
          { label: 'AI Triaged', value: `${stats?.auto_triage_pct ?? 0}%`, sub: 'auto-processed', color: 'text-nexgen-green' },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <p className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1">{s.label}</p>
            <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] text-nexgen-muted">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'P0', 'P1', 'P2', 'P3'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono transition-colors',
              filter === f ? 'bg-nexgen-accent/20 text-nexgen-accent' : 'text-nexgen-muted hover:text-nexgen-text')}>
            {f === 'all' ? `All (${messages.length})` : `${f} (${tierCount(f)})`}
          </button>
        ))}
      </div>

      {/* Split layout: message list + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Message list */}
        <div className={clsx('space-y-2', selected ? 'lg:col-span-2' : 'lg:col-span-5')}>
          {filtered.length === 0 && (
            <div className="glass-card p-12 text-center">
              <Inbox size={40} className="text-nexgen-muted mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-nexgen-text mb-2">No Communications</h3>
              <p className="text-xs text-nexgen-muted">Click Ingest to add messages or POST to /api/dcos/messages</p>
            </div>
          )}
          {filtered.map((comm) => {
            const ChannelIcon = channelIcons[comm.channel] ?? Mail
            const pri = comm.priority
            const isSelected = comm.id === selectedId

            return (
              <button key={comm.id} onClick={() => setSelectedId(isSelected ? null : comm.id)}
                className={clsx(
                  'w-full text-left p-4 rounded-lg border-l-[3px] transition-all',
                  pri ? tierBorder[pri.tier] : 'border-l-nexgen-border',
                  isSelected
                    ? 'bg-nexgen-accent/5 border border-nexgen-accent/20 ring-1 ring-nexgen-accent/10'
                    : 'glass-card-hover',
                  comm.status === 'archived' && 'opacity-50',
                )}>
                <div className="flex items-center gap-2 mb-1">
                  {pri && <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-mono font-bold', tierColors[pri.tier])}>{pri.tier}</span>}
                  <ChannelIcon size={11} className="text-nexgen-muted" />
                  <span className="text-[11px] font-semibold text-nexgen-text truncate flex-1">{comm.sender_name}</span>
                  <span className="text-[10px] font-mono text-nexgen-muted shrink-0">
                    {pri ? pri.qps : '?'}
                  </span>
                  <ChevronRight size={12} className={clsx('text-nexgen-muted transition-transform', isSelected && 'rotate-90')} />
                </div>
                <p className="text-xs text-nexgen-text truncate">{comm.subject}</p>
                <div className="flex items-center gap-2 mt-1">
                  {comm.decision && (
                    <span className={clsx('text-[9px] font-mono', actionColors[comm.decision.action]?.split(' ')[0])}>
                      {actionLabels[comm.decision.action]}
                    </span>
                  )}
                  {comm.status === 'actioned' && <span className="text-[9px] text-nexgen-green font-mono">Done</span>}
                  {comm.status === 'archived' && <span className="text-[9px] text-nexgen-muted font-mono">Archived</span>}
                  <span className="text-[9px] text-nexgen-muted font-mono ml-auto">
                    {comm.created_at ? new Date(comm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right: Detail panel */}
        {selected && (
          <div className="lg:col-span-3">
            <MessageDetail
              message={selected}
              busy={busy}
              onExecute={(id) => withBusy(id, () => executeDCOSAction(id).then(() => {}))}
              onArchive={(id) => withBusy(id, () => archiveDCOSMessage(id).then(() => {}))}
              onDelete={(id) => withBusy(id, () => deleteDCOSMessage(id).then(() => { setSelectedId(null) }))}
              onRetriage={(id) => withBusy(id, () => triageDCOSMessage(id).then(() => {}))}
              onUpdateAction={(id, action) => withBusy(id, () => updateDCOSDecision(id, action).then(() => {}))}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>

      {/* Briefing */}
      {latestBriefing && (
        <div className="glass-card p-6 border-l-2 border-nexgen-accent">
          <div className="flex items-start gap-3">
            <Brain size={20} className="text-nexgen-accent flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold text-nexgen-text">{latestBriefing.title}</h3>
                <span className="text-[10px] text-nexgen-muted font-mono ml-auto">
                  {latestBriefing.created_at ? new Date(latestBriefing.created_at).toLocaleString() : ''}
                  {' | '}{latestBriefing.message_ids?.length ?? 0} msgs
                </span>
              </div>
              <p className="text-xs text-nexgen-muted leading-relaxed mb-2">{latestBriefing.content}</p>
              {latestBriefing.insights?.map((ins, i) => (
                <div key={i} className="text-xs text-nexgen-muted mb-1">
                  <strong className="text-nexgen-text">{ins.label}:</strong>{' '}
                  {ins.text || (ins.items && ins.items.length > 0
                    ? (typeof ins.items[0] === 'string'
                      ? ins.items.join(', ')
                      : (ins.items as unknown as { priority: string; text: string }[]).map((it) => `[${it.priority}] ${it.text}`).join('; '))
                    : 'None')}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onSubmit={() => { setShowCompose(false); refetchMsgs() }} />}
    </div>
  )
}


// --- Detail Panel ---
function MessageDetail({
  message: m, busy, onExecute, onArchive, onDelete, onRetriage, onUpdateAction, onClose,
}: {
  message: QCMessage
  busy: Record<string, boolean>
  onExecute: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onRetriage: (id: string) => void
  onUpdateAction: (id: string, action: string) => void
  onClose: () => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editAction, setEditAction] = useState(false)
  const [copied, setCopied] = useState(false)
  const pri = m.priority
  const dec = m.decision
  const isBusy = busy[m.id]
  const ChannelIcon = channelIcons[m.channel] ?? Mail
  const DelegateIcon = dec?.delegate_to ? (agentIcons[dec.delegate_to] ?? Bot) : Bot

  const copyDraft = () => {
    if (dec?.draft_response) {
      navigator.clipboard.writeText(dec.draft_response)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="glass-card p-6 space-y-5 sticky top-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {pri && <span className={clsx('text-[10px] px-2 py-0.5 rounded font-mono font-bold', tierColors[pri.tier])}>{pri.tier}</span>}
            {pri && <span className="text-sm font-bold font-mono text-nexgen-text">QPS {pri.qps}</span>}
            <span className={clsx(
              'text-[10px] px-2 py-0.5 rounded-full font-mono',
              m.status === 'actioned' ? 'bg-nexgen-green/10 text-nexgen-green' :
              m.status === 'archived' ? 'bg-nexgen-muted/10 text-nexgen-muted' :
              m.status === 'triaged' ? 'bg-nexgen-accent/10 text-nexgen-accent' :
              'bg-nexgen-amber/10 text-nexgen-amber'
            )}>
              {m.status}
            </span>
          </div>
          <h2 className="text-base font-semibold text-nexgen-text mb-1">{m.subject}</h2>
          <div className="flex items-center gap-2 text-xs text-nexgen-muted">
            <ChannelIcon size={12} />
            <span className="font-mono">{m.sender_name}</span>
            {m.sender_address && <span className="text-nexgen-muted/50">({m.sender_address})</span>}
          </div>
        </div>
        <button onClick={onClose} className="text-nexgen-muted hover:text-nexgen-text p-1"><X size={16} /></button>
      </div>

      {/* Full body */}
      <div className="bg-nexgen-bg rounded-lg p-4">
        <p className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-2">Message Body</p>
        <p className="text-xs text-nexgen-text leading-relaxed whitespace-pre-wrap">{m.body}</p>
      </div>

      {/* Priority breakdown */}
      {pri && (
        <div className="space-y-3">
          <p className="text-[10px] text-nexgen-muted uppercase tracking-wider">AI Priority Analysis</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-nexgen-bg rounded-lg p-3">
              <p className="text-[10px] text-nexgen-muted mb-1">Urgency</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-nexgen-border/20 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-nexgen-red transition-all" style={{ width: `${pri.urgency}%` }} />
                </div>
                <span className="text-xs font-mono font-bold text-nexgen-text">{pri.urgency}</span>
              </div>
            </div>
            <div className="bg-nexgen-bg rounded-lg p-3">
              <p className="text-[10px] text-nexgen-muted mb-1">Importance</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-nexgen-border/20 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-nexgen-amber transition-all" style={{ width: `${pri.importance}%` }} />
                </div>
                <span className="text-xs font-mono font-bold text-nexgen-text">{pri.importance}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {pri.category && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-nexgen-bg border border-nexgen-border/30 text-nexgen-muted">{pri.category}</span>
            )}
            {pri.sentiment && (
              <span className={clsx('text-[10px] font-mono px-2 py-0.5 rounded border',
                pri.sentiment === 'urgent' ? 'bg-nexgen-red/10 border-nexgen-red/20 text-nexgen-red' :
                pri.sentiment === 'negative' ? 'bg-nexgen-amber/10 border-nexgen-amber/20 text-nexgen-amber' :
                pri.sentiment === 'positive' ? 'bg-nexgen-green/10 border-nexgen-green/20 text-nexgen-green' :
                'bg-nexgen-muted/10 border-nexgen-border/20 text-nexgen-muted'
              )}>{pri.sentiment}</span>
            )}
            {pri.deadline && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-nexgen-red/10 border border-nexgen-red/20 text-nexgen-red">
                Deadline: {new Date(pri.deadline).toLocaleString()}
              </span>
            )}
          </div>
          {pri.reasoning && (
            <p className="text-xs text-nexgen-accent/70 italic leading-relaxed">{pri.reasoning}</p>
          )}
        </div>
      )}

      {/* Decision */}
      {dec && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-nexgen-muted uppercase tracking-wider">AI Decision</p>
            <button onClick={() => setEditAction(!editAction)}
              className="ml-auto text-[10px] text-nexgen-accent hover:text-nexgen-accent/80 flex items-center gap-1 font-mono">
              <Edit3 size={10} /> {editAction ? 'Cancel' : 'Change'}
            </button>
          </div>

          {editAction ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allActions.map((act) => (
                <button key={act}
                  onClick={() => { onUpdateAction(m.id, act); setEditAction(false) }}
                  disabled={isBusy}
                  className={clsx(
                    'px-3 py-2 rounded-lg border text-xs font-mono transition-colors disabled:opacity-40',
                    dec.action === act
                      ? actionColors[act]
                      : 'border-nexgen-border/20 text-nexgen-muted hover:text-nexgen-text hover:border-nexgen-border/40'
                  )}>
                  {actionLabels[act]}
                </button>
              ))}
            </div>
          ) : (
            <div className={clsx('rounded-lg border p-4', actionColors[dec.action])}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold font-mono">{actionLabels[dec.action]}</span>
                {dec.delegate_to && (
                  <span className="flex items-center gap-1 text-xs font-mono opacity-80">
                    <DelegateIcon size={12} /> {dec.delegate_to}
                  </span>
                )}
                {dec.executed && <CheckCircle2 size={14} className="ml-auto" />}
              </div>
              {dec.reasoning && <p className="text-xs opacity-80 leading-relaxed">{dec.reasoning}</p>}
            </div>
          )}

          {/* Draft response */}
          {dec.draft_response && (
            <div className="bg-nexgen-bg rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] text-nexgen-muted uppercase tracking-wider">Draft Response</p>
                <button onClick={copyDraft}
                  className="ml-auto text-[10px] text-nexgen-accent hover:text-nexgen-accent/80 flex items-center gap-1 font-mono">
                  {copied ? <CheckCircle2 size={10} /> : <Copy size={10} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-nexgen-text leading-relaxed whitespace-pre-wrap">{dec.draft_response}</p>
            </div>
          )}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 pt-4 border-t border-nexgen-border/20 flex-wrap">
        {m.status !== 'actioned' && m.status !== 'archived' && dec && (
          <button onClick={() => onExecute(m.id)} disabled={isBusy}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-nexgen-accent/20 border border-nexgen-accent/30 text-nexgen-accent hover:bg-nexgen-accent/30 text-xs font-mono transition-colors disabled:opacity-40">
            {isBusy ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
            Approve & Execute
          </button>
        )}
        <button onClick={() => onRetriage(m.id)} disabled={isBusy}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-nexgen-border/30 text-nexgen-muted hover:text-nexgen-text text-xs font-mono transition-colors disabled:opacity-40">
          {isBusy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
          Re-Triage
        </button>
        {m.status !== 'archived' && (
          <button onClick={() => onArchive(m.id)} disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-nexgen-border/30 text-nexgen-muted hover:text-nexgen-text text-xs font-mono transition-colors disabled:opacity-40">
            <Archive size={12} /> Archive
          </button>
        )}
        {m.status === 'actioned' && (
          <span className="flex items-center gap-1.5 text-xs text-nexgen-green font-mono ml-auto">
            <CheckCircle2 size={14} /> Executed
          </span>
        )}
        {m.status === 'archived' && (
          <span className="flex items-center gap-1.5 text-xs text-nexgen-muted font-mono">
            <Archive size={14} /> Archived
          </span>
        )}

        {/* Delete */}
        <div className="ml-auto flex items-center gap-2">
          {confirmDelete ? (
            <>
              <span className="text-[10px] text-nexgen-red font-mono">Delete permanently?</span>
              <button onClick={() => onDelete(m.id)} disabled={isBusy}
                className="px-2 py-1 rounded text-[10px] font-mono bg-nexgen-red/20 text-nexgen-red hover:bg-nexgen-red/30 transition-colors disabled:opacity-40">
                Yes
              </button>
              <button onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 rounded text-[10px] font-mono text-nexgen-muted hover:text-nexgen-text transition-colors">
                No
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} disabled={isBusy}
              className="flex items-center gap-1 px-2 py-1 rounded text-nexgen-muted hover:text-nexgen-red hover:bg-nexgen-red/10 text-[10px] font-mono transition-colors disabled:opacity-40">
              <Trash2 size={11} /> Delete
            </button>
          )}
          <span className="text-[9px] text-nexgen-muted/40 font-mono">{m.id.slice(0, 8)}</span>
        </div>
      </div>
    </div>
  )
}


// --- Compose Modal ---
function ComposeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [channel, setChannel] = useState('email')
  const [senderName, setSenderName] = useState('')
  const [senderAddress, setSenderAddress] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!senderName || !subject || !body) return
    setLoading(true)
    try {
      const res = await ingestDCOSMessage({
        channel, sender_name: senderName, sender_address: senderAddress || undefined,
        subject, body,
      })
      setResult(`Triaged: ${res.triage?.tier ?? 'pending'} | QPS: ${res.triage?.qps ?? '?'} | Action: ${res.triage?.action ?? 'pending'}`)
      setTimeout(onSubmit, 1500)
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="glass-card p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-nexgen-text flex items-center gap-2">
            <Send size={14} className="text-nexgen-accent" /> Ingest Communication
          </h3>
          <button onClick={onClose} className="text-nexgen-muted hover:text-nexgen-text"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1 block">Channel</label>
            <select value={channel} onChange={e => setChannel(e.target.value)}
              className="w-full bg-nexgen-bg border border-nexgen-border/30 rounded px-3 py-2 text-xs font-mono text-nexgen-text">
              {['email', 'slack', 'teams', 'sms', 'voice', 'platform'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1 block">From</label>
            <input value={senderName} onChange={e => setSenderName(e.target.value)}
              className="w-full bg-nexgen-bg border border-nexgen-border/30 rounded px-3 py-2 text-xs font-mono text-nexgen-text placeholder:text-nexgen-muted/50"
              placeholder="Sarah Chen (CFO)" />
          </div>
        </div>

        <div>
          <label className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1 block">Address</label>
          <input value={senderAddress} onChange={e => setSenderAddress(e.target.value)}
            className="w-full bg-nexgen-bg border border-nexgen-border/30 rounded px-3 py-2 text-xs font-mono text-nexgen-text placeholder:text-nexgen-muted/50"
            placeholder="sarah@company.com (optional)" />
        </div>

        <div>
          <label className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1 block">Subject</label>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            className="w-full bg-nexgen-bg border border-nexgen-border/30 rounded px-3 py-2 text-xs font-mono text-nexgen-text placeholder:text-nexgen-muted/50"
            placeholder="Board Deck — Final Review Needed" />
        </div>

        <div>
          <label className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1 block">Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={5}
            className="w-full bg-nexgen-bg border border-nexgen-border/30 rounded px-3 py-2 text-xs font-mono text-nexgen-text placeholder:text-nexgen-muted/50 resize-none"
            placeholder="Full message body..." />
        </div>

        {result && (
          <div className={clsx('text-xs font-mono px-3 py-2 rounded',
            result.startsWith('Error') ? 'bg-nexgen-red/10 text-nexgen-red' : 'bg-nexgen-green/10 text-nexgen-green')}>
            {result}
          </div>
        )}

        <button onClick={handleSubmit} disabled={loading || !senderName || !subject || !body}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-nexgen-accent/20 border border-nexgen-accent/30 text-nexgen-accent hover:bg-nexgen-accent/30 disabled:opacity-40 transition-colors text-xs font-mono">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Ingest & Auto-Triage via Bedrock
        </button>
      </div>
    </div>
  )
}
