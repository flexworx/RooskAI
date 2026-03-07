'use client'

import { useState } from 'react'
import { Brain, Inbox, ArrowUpRight, Clock, Users, Zap, MessageSquare, Mail, Phone, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react'
import { clsx } from 'clsx'

interface Communication {
  id: string
  channel: 'email' | 'slack' | 'teams' | 'sms' | 'voice'
  from: string
  subject: string
  preview: string
  qps: number
  tier: 'P0' | 'P1' | 'P2' | 'P3'
  action: 'respond_now' | 'defer' | 'delegate' | 'archive'
  timestamp: string
  sentiment: 'positive' | 'neutral' | 'negative' | 'urgent'
}

const communications: Communication[] = [
  { id: '1', channel: 'email', from: 'Sarah Chen (CFO)', subject: 'Board Deck — Final Review Needed', preview: 'Need your sign-off on Q1 financials before 3pm. Attached updated deck with variance notes.', qps: 95, tier: 'P0', action: 'respond_now', timestamp: '2026-03-07T09:15:00Z', sentiment: 'urgent' },
  { id: '2', channel: 'slack', from: 'DevOps Team (#infra)', subject: 'VM-APP-03 CPU spike resolved', preview: 'Auto-scaled from 4 to 8 vCPUs per runbook. Monitoring stable for 45 min. No user impact.', qps: 42, tier: 'P2', action: 'archive', timestamp: '2026-03-07T08:52:00Z', sentiment: 'positive' },
  { id: '3', channel: 'email', from: 'Marcus Webb (Legal)', subject: 'SOC 2 Audit — Evidence Request', preview: 'Auditors requesting access control matrix and change management logs for Feb. Deadline: March 14.', qps: 78, tier: 'P1', action: 'delegate', timestamp: '2026-03-07T08:30:00Z', sentiment: 'neutral' },
  { id: '4', channel: 'voice', from: 'James Rodriguez (CTO, Partner)', subject: 'Voicemail: Partnership API Integration', preview: 'Left a 3-minute voicemail about accelerating the API integration timeline. Mentioned Q2 launch pressure.', qps: 82, tier: 'P1', action: 'respond_now', timestamp: '2026-03-07T08:10:00Z', sentiment: 'neutral' },
  { id: '5', channel: 'teams', from: 'HR Department', subject: 'Updated PTO Policy Draft', preview: 'Attached the revised PTO policy for your review. No rush — target review by end of week.', qps: 25, tier: 'P3', action: 'defer', timestamp: '2026-03-07T07:45:00Z', sentiment: 'neutral' },
  { id: '6', channel: 'sms', from: 'Alex Murphy (On-Call)', subject: 'Alert: SSL cert expiry warning', preview: 'Heads up — wildcard cert expires in 12 days. Renewal runbook queued. Confirm to execute?', qps: 68, tier: 'P2', action: 'respond_now', timestamp: '2026-03-07T07:20:00Z', sentiment: 'negative' },
]

const channelIcons = { email: Mail, slack: MessageSquare, teams: Users, sms: Phone, voice: Phone }
const tierColors = { P0: 'bg-nexgen-red text-white', P1: 'bg-nexgen-amber/80 text-white', P2: 'bg-nexgen-blue/80 text-white', P3: 'bg-nexgen-muted/30 text-nexgen-muted' }
const actionLabels = { respond_now: 'Respond Now', defer: 'Defer', delegate: 'Delegate', archive: 'Archive' }
const actionColors = { respond_now: 'text-nexgen-red', defer: 'text-nexgen-blue', delegate: 'text-nexgen-amber', archive: 'text-nexgen-muted' }

export default function ChiefOfStaffPage() {
  const [filter, setFilter] = useState<'all' | 'P0' | 'P1' | 'P2' | 'P3'>('all')

  const filtered = filter === 'all' ? communications : communications.filter((c) => c.tier === filter)
  const p0Count = communications.filter((c) => c.tier === 'P0').length
  const avgQPS = Math.round(communications.reduce((s, c) => s + c.qps, 0) / communications.length)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <Brain size={22} className="text-nexgen-accent" />
          Digital Chief of Staff
        </h1>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-1 rounded-full bg-nexgen-accent/10 text-nexgen-accent font-mono">Quantum Comms v2</span>
          <span className="px-2 py-1 rounded-full bg-nexgen-green/10 text-nexgen-green font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-nexgen-green animate-pulse" /> AI Active
          </span>
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1">Inbox Queue</p>
          <p className="text-2xl font-bold gradient-text">{communications.length}</p>
          <p className="text-[10px] text-nexgen-muted">communications</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1">Critical (P0)</p>
          <p className="text-2xl font-bold text-nexgen-red">{p0Count}</p>
          <p className="text-[10px] text-nexgen-muted">need immediate action</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1">Avg QPS</p>
          <p className="text-2xl font-bold text-nexgen-text">{avgQPS}</p>
          <p className="text-[10px] text-nexgen-muted">quantum priority score</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-[10px] text-nexgen-muted uppercase tracking-wider mb-1">AI Decisions</p>
          <p className="text-2xl font-bold text-nexgen-green">94%</p>
          <p className="text-[10px] text-nexgen-muted">auto-triaged today</p>
        </div>
      </div>

      {/* Priority filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'P0', 'P1', 'P2', 'P3'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs font-mono transition-colors',
              filter === f ? 'bg-nexgen-accent/20 text-nexgen-accent' : 'text-nexgen-muted hover:text-nexgen-text'
            )}
          >
            {f === 'all' ? `All (${communications.length})` : `${f} (${communications.filter((c) => c.tier === f).length})`}
          </button>
        ))}
      </div>

      {/* Communication feed */}
      <div className="space-y-3">
        {filtered.map((comm) => {
          const ChannelIcon = channelIcons[comm.channel]
          return (
            <div key={comm.id} className="glass-card-hover p-5">
              <div className="flex items-start gap-4">
                {/* QPS gauge */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full border-2 border-nexgen-border/30 flex items-center justify-center relative">
                  <span className="text-sm font-bold font-mono text-nexgen-text">{comm.qps}</span>
                  <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="21" fill="none" stroke="currentColor" strokeWidth="2" className="text-nexgen-border/20" />
                    <circle
                      cx="24" cy="24" r="21" fill="none" strokeWidth="2"
                      strokeDasharray={`${(comm.qps / 100) * 132} 132`}
                      strokeLinecap="round"
                      className={comm.qps >= 90 ? 'text-nexgen-red' : comm.qps >= 70 ? 'text-nexgen-amber' : comm.qps >= 40 ? 'text-nexgen-blue' : 'text-nexgen-muted'}
                    />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={clsx('text-[9px] px-1.5 py-0.5 rounded font-mono font-bold', tierColors[comm.tier])}>{comm.tier}</span>
                    <ChannelIcon size={12} className="text-nexgen-muted" />
                    <span className="text-xs font-semibold text-nexgen-text">{comm.from}</span>
                    <span className="text-[10px] text-nexgen-muted font-mono ml-auto">{new Date(comm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <h3 className="text-sm font-medium text-nexgen-text mb-1">{comm.subject}</h3>
                  <p className="text-xs text-nexgen-muted leading-relaxed">{comm.preview}</p>

                  <div className="flex items-center gap-3 mt-3">
                    <span className={clsx('text-[10px] font-mono font-semibold flex items-center gap-1', actionColors[comm.action])}>
                      {comm.action === 'respond_now' && <Zap size={10} />}
                      {comm.action === 'delegate' && <Users size={10} />}
                      {comm.action === 'defer' && <Clock size={10} />}
                      {comm.action === 'archive' && <CheckCircle2 size={10} />}
                      AI Recommends: {actionLabels[comm.action]}
                    </span>
                    {comm.sentiment === 'urgent' && (
                      <span className="text-[10px] text-nexgen-red flex items-center gap-0.5">
                        <AlertTriangle size={10} /> Urgent sentiment detected
                      </span>
                    )}
                    <button className="ml-auto flex items-center gap-1 text-[10px] text-nexgen-accent hover:text-nexgen-accent/80 transition-colors">
                      Take Action <ArrowRight size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* AI Insight panel */}
      <div className="glass-card p-6 border-l-2 border-nexgen-accent">
        <div className="flex items-start gap-3">
          <Brain size={20} className="text-nexgen-accent flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-nexgen-text mb-2">AI Daily Briefing</h3>
            <div className="space-y-2 text-xs text-nexgen-muted leading-relaxed">
              <p><strong className="text-nexgen-text">Priority Focus:</strong> Board deck review (P0) requires immediate attention — CFO deadline is 3:00 PM today.</p>
              <p><strong className="text-nexgen-text">Delegation Opportunity:</strong> SOC 2 evidence request can be routed to the compliance team. Draft delegation message ready.</p>
              <p><strong className="text-nexgen-text">Relationship Alert:</strong> James Rodriguez (CTO, Partner) has called twice this week. Consider scheduling a dedicated sync to address API integration timeline concerns.</p>
              <p><strong className="text-nexgen-text">Operational Note:</strong> SSL cert renewal is queued in runbooks. Auto-execute is available — approve to close this loop.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
