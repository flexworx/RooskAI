'use client'

import { Bot, Heart, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import type { MurphAgent } from '@/types'

interface Props {
  agents: MurphAgent[]
}

const agentStatusConfig: Record<string, { color: string; pulse: boolean }> = {
  active: { color: 'bg-nexgen-green', pulse: true },
  inactive: { color: 'bg-nexgen-muted', pulse: false },
  warning: { color: 'bg-nexgen-amber', pulse: true },
  critical: { color: 'bg-nexgen-red', pulse: true },
}

export function MurphAgentStatus({ agents }: Props) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bot size={16} className="text-nexgen-accent" />
        <h3 className="text-sm font-semibold text-nexgen-text">Murph.ai Agents</h3>
        <span className="ml-auto text-xs text-nexgen-muted font-mono">{agents.filter((a) => a.status === 'active').length}/{agents.length} active</span>
      </div>
      <div className="space-y-2">
        {agents.map((agent) => {
          const cfg = agentStatusConfig[agent.status] ?? agentStatusConfig['inactive']!
          return (
            <div key={agent.agent_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-nexgen-bg/30">
              <span className={clsx('w-2.5 h-2.5 rounded-full shrink-0', cfg.color, cfg.pulse && 'animate-pulse')} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-nexgen-text truncate">{agent.name}</p>
                <p className="text-[10px] text-nexgen-muted">{agent.agent_id}</p>
              </div>
              <div className="text-right">
                {agent.missed_heartbeats > 0 ? (
                  <span className="flex items-center gap-1 text-[10px] text-nexgen-amber"><AlertCircle size={10} />{agent.missed_heartbeats} missed</span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-nexgen-green"><Heart size={10} />OK</span>
                )}
              </div>
            </div>
          )
        })}
        {agents.length === 0 && <div className="text-center py-6 text-nexgen-muted text-sm">No agents registered. Use POST /api/murph/event to register.</div>}
      </div>
    </div>
  )
}
