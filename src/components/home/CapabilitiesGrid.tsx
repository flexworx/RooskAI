'use client'

import {
  Server, Database, Network, Shield, Bot, Activity,
  HardDrive, Lock, Terminal, Globe, Cpu, BarChart3,
} from 'lucide-react'
import { MotionSection, MotionDiv, fadeInUp } from '@/components/ui/motion'

const capabilities = [
  { icon: Server, label: 'VM Orchestration', desc: 'Provision and manage virtual machines through AI commands' },
  { icon: Database, label: 'Database Management', desc: 'PostgreSQL HA with automated failover and backup' },
  { icon: Network, label: 'Network Automation', desc: 'VLAN segmentation, OPNsense firewalls, Cato SASE' },
  { icon: Shield, label: 'Security Operations', desc: 'Wazuh SIEM, real-time threat detection, incident response' },
  { icon: Bot, label: 'AI Agent Framework', desc: '7 specialized agents for infrastructure, security, and DaaS' },
  { icon: Activity, label: 'Real-Time Monitoring', desc: 'Prometheus + Grafana with predictive alerting' },
  { icon: HardDrive, label: 'Storage Intelligence', desc: 'ZFS RAIDZ1 with automated health checks and snapshots' },
  { icon: Lock, label: 'Secrets Management', desc: 'HashiCorp Vault with auto-unseal and rotation policies' },
  { icon: Terminal, label: 'Infrastructure as Code', desc: 'Ansible playbooks, cloud-init, automated provisioning' },
  { icon: Globe, label: 'Edge & SASE', desc: 'Cato Networks SASE with Cisco Catalyst 9500 switching' },
  { icon: Cpu, label: 'Compute Platform', desc: 'Dell R7625 with dual EPYC 9354 — 128 threads' },
  { icon: BarChart3, label: 'Compliance Dashboards', desc: 'SOC 2 and NIST control status at a glance' },
]

export function CapabilitiesGrid() {
  return (
    <MotionSection className="section-padding bg-nexgen-surface/50">
      <div className="section-container">
        <MotionDiv className="text-center mb-16">
          <span className="text-xs font-mono text-nexgen-accent uppercase tracking-[0.2em] mb-4 block">
            Capabilities
          </span>
          <h2 className="heading-lg mb-4">
            Everything your infrastructure needs.
            <br />
            <span className="gradient-text">Managed by AI.</span>
          </h2>
        </MotionDiv>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {capabilities.map((cap) => (
            <MotionDiv
              key={cap.label}
              variants={fadeInUp}
              className="glass-card-hover p-5 group cursor-default"
            >
              <cap.icon
                size={20}
                className="text-nexgen-accent mb-3 group-hover:scale-110 transition-transform duration-300"
              />
              <h4 className="text-sm font-semibold text-nexgen-text mb-1.5">
                {cap.label}
              </h4>
              <p className="text-xs text-nexgen-muted leading-relaxed">
                {cap.desc}
              </p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </MotionSection>
  )
}
