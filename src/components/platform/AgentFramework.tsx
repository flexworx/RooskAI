'use client'

import { Bot, Server, Shield, Database, Network, Monitor, Laptop } from 'lucide-react'
import { MotionSection, MotionDiv, fadeInUp } from '@/components/ui/motion'

const agents = [
  { icon: Bot, id: 'murph-general', name: 'Murph (General)', desc: 'Conversational AI gateway — routes commands to specialized agents', status: 'active' },
  { icon: Server, id: 'infra-agent', name: 'Infrastructure Agent', desc: 'VM lifecycle, Proxmox orchestration, template provisioning', status: 'active' },
  { icon: Shield, id: 'security-agent', name: 'Security Agent', desc: 'Threat detection, alert triage, incident response automation', status: 'active' },
  { icon: Database, id: 'database-agent', name: 'Database Agent', desc: 'PostgreSQL management, replication, backup, and recovery', status: 'active' },
  { icon: Network, id: 'network-agent', name: 'Network Agent', desc: 'VLAN management, firewall rules, DNS, routing configuration', status: 'active' },
  { icon: Monitor, id: 'monitoring-agent', name: 'Monitoring Agent', desc: 'Prometheus queries, alert correlation, performance analysis', status: 'active' },
  { icon: Laptop, id: 'daas-agent', name: 'DaaS Agent', desc: 'Desktop-as-a-Service provisioning and lifecycle management', status: 'planned' },
]

export function AgentFramework() {
  return (
    <MotionSection className="section-padding bg-nexgen-bg">
      <div className="section-container">
        <MotionDiv className="text-center mb-16">
          <span className="text-xs font-mono text-nexgen-accent uppercase tracking-[0.2em] mb-4 block">
            Agent Framework
          </span>
          <h2 className="heading-lg mb-4">
            Seven specialized agents.
            <br />
            <span className="gradient-text">One unified intelligence.</span>
          </h2>
          <p className="body-md max-w-xl mx-auto">
            Each agent is a domain expert with scoped permissions, dedicated
            capabilities, and SOC 2-compliant audit trails.
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {agents.map((agent) => (
            <MotionDiv
              key={agent.id}
              variants={fadeInUp}
              className="glass-card-hover p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-nexgen-accent/10 border border-nexgen-accent/20 flex items-center justify-center">
                  <agent.icon size={16} className="text-nexgen-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-nexgen-text truncate">
                    {agent.name}
                  </h4>
                  <span className="text-[10px] font-mono text-nexgen-muted">{agent.id}</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  agent.status === 'active'
                    ? 'bg-nexgen-green/20 text-nexgen-green'
                    : 'bg-nexgen-purple/20 text-nexgen-purple'
                }`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-xs text-nexgen-muted leading-relaxed">
                {agent.desc}
              </p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </MotionSection>
  )
}
