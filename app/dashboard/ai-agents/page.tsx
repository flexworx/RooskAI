'use client'

import { useCallback } from 'react'
import { Bot, Heart, AlertCircle, Trash2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getAgents, deregisterAgent } from '@/services/api'
import { clsx } from 'clsx'
import type { MurphAgent } from '@/types'

const statusConfig: Record<string, { color: string; pulse: boolean }> = {
  active: { color: 'bg-nexgen-green', pulse: true },
  inactive: { color: 'bg-nexgen-muted', pulse: false },
  warning: { color: 'bg-nexgen-amber', pulse: true },
  critical: { color: 'bg-nexgen-red', pulse: true },
}

export default function AIAgentsPage() {
  const fetcher = useCallback(() => getAgents(), [])
  const { data, loading, refetch } = useApi<MurphAgent[]>(fetcher, 10000)
  const agents = Array.isArray(data) ? data : []

  const handleDeregister = async (agentId: string) => {
    await deregisterAgent(agentId)
    refetch()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
        <Bot size={22} className="text-nexgen-accent" />
        AI Agents
        <span className="ml-2 text-xs font-mono text-nexgen-muted">{agents.filter(a => a.status === 'active').length}/{agents.length} active</span>
      </h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <div key={i} className="glass-card p-5 animate-pulse"><div className="h-4 bg-nexgen-border/30 rounded w-32" /></div>)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const cfg = statusConfig[agent.status] ?? statusConfig['inactive']!
            return (
              <div key={agent.agent_id} className="glass-card-hover p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className={clsx('w-3 h-3 rounded-full shrink-0', cfg.color, cfg.pulse && 'animate-pulse')} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-mono font-semibold text-nexgen-text truncate">{agent.name}</h3>
                    <p className="text-[10px] text-nexgen-muted font-mono">{agent.agent_id}</p>
                  </div>
                  <div className="text-right">
                    {agent.missed_heartbeats > 0 ? (
                      <span className="flex items-center gap-1 text-xs text-nexgen-amber"><AlertCircle size={12} />{agent.missed_heartbeats} missed</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-nexgen-green"><Heart size={12} />Healthy</span>
                    )}
                  </div>
                </div>

                {agent.description && <p className="text-xs text-nexgen-muted mb-3">{agent.description}</p>}

                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {agent.capabilities.map((cap) => (
                      <span key={cap} className="text-[10px] font-mono px-2 py-0.5 rounded bg-nexgen-bg border border-nexgen-border/30 text-nexgen-muted">{cap}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-nexgen-border/20">
                  <div className="text-[10px] text-nexgen-muted">
                    {agent.last_heartbeat ? `Last heartbeat: ${new Date(agent.last_heartbeat).toLocaleTimeString()}` : 'No heartbeat'}
                  </div>
                  <button onClick={() => handleDeregister(agent.agent_id)} className="p-1.5 rounded hover:bg-nexgen-red/10 transition-colors group">
                    <Trash2 size={12} className="text-nexgen-muted group-hover:text-nexgen-red" />
                  </button>
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
          <p className="text-xs text-nexgen-muted">Use POST /api/murph/event to register an agent.</p>
        </div>
      )}
    </div>
  )
}
