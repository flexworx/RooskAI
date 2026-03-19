'use client'

import { useCallback, useState } from 'react'
import {
  Bot, Heart, AlertCircle, Trash2, Power, PowerOff,
  Play, Send, Shield, Server, Database, Network, Monitor, Activity,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getAgents, deregisterAgent, setAgentStatus, dispatchAgentCommand } from '@/services/api'
import { clsx } from 'clsx'
import type { MurphAgent } from '@/types'

const statusConfig: Record<string, { color: string; pulse: boolean; label: string }> = {
  active: { color: 'bg-nexgen-green', pulse: true, label: 'Active' },
  inactive: { color: 'bg-nexgen-muted', pulse: false, label: 'Inactive' },
  warning: { color: 'bg-nexgen-amber', pulse: true, label: 'Warning' },
  critical: { color: 'bg-nexgen-red', pulse: true, label: 'Critical' },
}

const agentIcons: Record<string, typeof Bot> = {
  generic: Bot,
  infrastructure: Server,
  security: Shield,
  database: Database,
  networking: Network,
  daas: Monitor,
  monitoring: Activity,
}

export default function AIAgentsPage() {
  const fetcher = useCallback(() => getAgents(), [])
  const { data, loading, refetch } = useApi<MurphAgent[]>(fetcher, 10000)
  const agents = Array.isArray(data) ? data : []
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const [commandInput, setCommandInput] = useState<Record<string, string>>({})
  const [commandResults, setCommandResults] = useState<Record<string, { status: string; job_id?: string; error?: string }>>({})

  const withBusy = async (agentId: string, fn: () => Promise<void>) => {
    setBusy(p => ({ ...p, [agentId]: true }))
    try { await fn() } finally { setBusy(p => ({ ...p, [agentId]: false })) }
  }

  const handleToggleStatus = (agent: MurphAgent) =>
    withBusy(agent.agent_id, async () => {
      const newStatus = agent.status === 'active' ? 'inactive' : 'active'
      await setAgentStatus(agent.agent_id, newStatus)
      refetch()
    })

  const handleDeregister = (agentId: string) =>
    withBusy(agentId, async () => {
      await deregisterAgent(agentId)
      refetch()
    })

  const handleDispatch = (agentId: string) =>
    withBusy(agentId, async () => {
      const cmd = commandInput[agentId]?.trim()
      if (!cmd) return
      try {
        const result = await dispatchAgentCommand(agentId, cmd)
        setCommandResults(p => ({ ...p, [agentId]: { status: 'queued', job_id: result.job_id } }))
        setCommandInput(p => ({ ...p, [agentId]: '' }))
      } catch (e) {
        setCommandResults(p => ({ ...p, [agentId]: { status: 'error', error: e instanceof Error ? e.message : 'Failed' } }))
      }
      refetch()
    })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
        <Bot size={22} className="text-nexgen-accent" />
        AI Agents
        <span className="ml-2 text-xs font-mono text-nexgen-muted">
          {agents.filter(a => a.status === 'active').length}/{agents.length} active
        </span>
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-nexgen-border/30 rounded w-32" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const cfg = statusConfig[agent.status] ?? statusConfig['inactive']!
            const AgentIcon = agentIcons[agent.agent_type ?? 'generic'] ?? Bot
            const isBusy = busy[agent.agent_id]
            const cmdResult = commandResults[agent.agent_id]

            return (
              <div key={agent.agent_id} className="glass-card-hover p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <AgentIcon size={20} className="text-nexgen-accent" />
                    <span className={clsx(
                      'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-nexgen-card',
                      cfg.color, cfg.pulse && 'animate-pulse'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-mono font-semibold text-nexgen-text truncate">{agent.name}</h3>
                    <p className="text-[10px] text-nexgen-muted font-mono">{agent.agent_id}</p>
                  </div>
                  <span className={clsx(
                    'text-[10px] font-mono px-2 py-0.5 rounded-full',
                    agent.status === 'active' ? 'bg-nexgen-green/10 text-nexgen-green' :
                    agent.status === 'critical' ? 'bg-nexgen-red/10 text-nexgen-red' :
                    agent.status === 'warning' ? 'bg-nexgen-amber/10 text-nexgen-amber' :
                    'bg-nexgen-muted/10 text-nexgen-muted'
                  )}>
                    {cfg.label}
                  </span>
                </div>

                {agent.description && <p className="text-xs text-nexgen-muted mb-3">{agent.description}</p>}

                {/* Capabilities */}
                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {agent.capabilities.slice(0, 6).map((cap) => (
                      <span key={cap} className="text-[10px] font-mono px-2 py-0.5 rounded bg-nexgen-bg border border-nexgen-border/30 text-nexgen-muted">{cap}</span>
                    ))}
                    {agent.capabilities.length > 6 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-nexgen-bg border border-nexgen-border/30 text-nexgen-muted">+{agent.capabilities.length - 6} more</span>
                    )}
                  </div>
                )}

                {/* Heartbeat */}
                <div className="flex items-center gap-2 mb-3 text-xs">
                  {agent.missed_heartbeats > 0 ? (
                    <span className="flex items-center gap-1 text-nexgen-amber"><AlertCircle size={12} />{agent.missed_heartbeats} missed</span>
                  ) : agent.status === 'active' ? (
                    <span className="flex items-center gap-1 text-nexgen-green"><Heart size={12} />Healthy</span>
                  ) : null}
                  {agent.last_heartbeat && (
                    <span className="text-[10px] text-nexgen-muted ml-auto">
                      Last: {new Date(agent.last_heartbeat).toLocaleTimeString()}
                    </span>
                  )}
                </div>

                {/* Command input — only for active agents */}
                {agent.status === 'active' && (
                  <div className="mb-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Send command..."
                        value={commandInput[agent.agent_id] ?? ''}
                        onChange={e => setCommandInput(p => ({ ...p, [agent.agent_id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleDispatch(agent.agent_id)}
                        className="flex-1 bg-nexgen-bg border border-nexgen-border/30 rounded px-3 py-1.5 text-xs font-mono text-nexgen-text placeholder:text-nexgen-muted/50 focus:outline-none focus:border-nexgen-accent/50"
                        disabled={isBusy}
                      />
                      <button
                        onClick={() => handleDispatch(agent.agent_id)}
                        disabled={isBusy || !commandInput[agent.agent_id]?.trim()}
                        className="px-3 py-1.5 rounded bg-nexgen-accent/10 hover:bg-nexgen-accent/20 text-nexgen-accent transition-colors disabled:opacity-30"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                    {cmdResult && (
                      <div className={clsx(
                        'mt-1.5 text-[10px] font-mono px-2 py-1 rounded',
                        cmdResult.status === 'error' ? 'bg-nexgen-red/10 text-nexgen-red' : 'bg-nexgen-green/10 text-nexgen-green'
                      )}>
                        {cmdResult.status === 'error' ? cmdResult.error : `Queued: ${cmdResult.job_id}`}
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-3 border-t border-nexgen-border/20">
                  <button
                    onClick={() => handleToggleStatus(agent)}
                    disabled={isBusy}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono transition-colors disabled:opacity-50',
                      agent.status === 'active'
                        ? 'bg-nexgen-amber/10 hover:bg-nexgen-amber/20 text-nexgen-amber'
                        : 'bg-nexgen-green/10 hover:bg-nexgen-green/20 text-nexgen-green'
                    )}
                  >
                    {agent.status === 'active' ? <PowerOff size={12} /> : <Power size={12} />}
                    {agent.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>

                  {agent.status !== 'active' && (
                    <button
                      onClick={() => handleToggleStatus({ ...agent, status: 'inactive' })}
                      disabled={isBusy}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono bg-nexgen-green/10 hover:bg-nexgen-green/20 text-nexgen-green transition-colors disabled:opacity-50"
                    >
                      <Play size={12} />
                      Start
                    </button>
                  )}

                  <div className="ml-auto">
                    <button
                      onClick={() => handleDeregister(agent.agent_id)}
                      disabled={isBusy}
                      className="p-1.5 rounded hover:bg-nexgen-red/10 transition-colors group disabled:opacity-50"
                    >
                      <Trash2 size={12} className="text-nexgen-muted group-hover:text-nexgen-red" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!loading && agents.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Bot size={40} className="text-nexgen-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-nexgen-text mb-2">No Agents Registered</h3>
          <p className="text-xs text-nexgen-muted">Agents will appear here once registered via the platform API.</p>
        </div>
      )}
    </div>
  )
}
