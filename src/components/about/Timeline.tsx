'use client'

import { motion } from 'framer-motion'
import { MotionSection, MotionDiv } from '@/components/ui/motion'

const milestones = [
  {
    phase: 'Phase 1',
    title: 'Foundation',
    description: 'Dell R7625 provisioned. Proxmox VE installed. ZFS RAIDZ1 configured across 11.5TB NVMe. Core networking established with Cisco Catalyst 9500.',
    status: 'complete',
  },
  {
    phase: 'Phase 2',
    title: 'Security Core',
    description: 'Keycloak IAM, HashiCorp Vault, OPNsense firewall, and Wazuh SIEM deployed. Zero-trust architecture established across all VLANs.',
    status: 'complete',
  },
  {
    phase: 'Phase 3',
    title: 'Platform API & Dashboard',
    description: 'FastAPI control plane built with 14 route modules. React dashboard with 12 management pages. Full audit middleware and RBAC.',
    status: 'complete',
  },
  {
    phase: 'Phase 4',
    title: 'Database Layer',
    description: 'PostgreSQL primary and replica with pgvector. Automated backup, streaming replication, and connection pool monitoring.',
    status: 'complete',
  },
  {
    phase: 'Phase 5',
    title: 'AI Integration',
    description: 'CentralIntel.ai LLM proxy with AWS Bedrock. Data sanitization layer. 28 automated actions. 7 specialized AI agents.',
    status: 'complete',
  },
  {
    phase: 'Phase 6',
    title: 'Public Platform & Scale',
    description: 'Next.js public-facing platform. Enterprise marketing site. Full RADF quality review. Production hardening.',
    status: 'active',
  },
]

export function Timeline() {
  return (
    <MotionSection className="section-padding bg-nexgen-bg">
      <div className="section-container">
        <MotionDiv className="text-center mb-16">
          <span className="text-xs font-mono text-nexgen-accent uppercase tracking-[0.2em] mb-4 block">
            Journey
          </span>
          <h2 className="heading-lg">Built in public. Built to last.</h2>
        </MotionDiv>

        <div className="max-w-2xl mx-auto relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-nexgen-border/30" />

          <div className="space-y-8">
            {milestones.map((m, i) => (
              <motion.div
                key={m.phase}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="relative pl-14"
              >
                {/* Dot */}
                <div className={`absolute left-3.5 top-1 w-3 h-3 rounded-full border-2 ${
                  m.status === 'active'
                    ? 'bg-nexgen-accent border-nexgen-accent animate-pulse'
                    : m.status === 'complete'
                      ? 'bg-nexgen-green border-nexgen-green'
                      : 'bg-nexgen-border border-nexgen-border'
                }`} />

                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono text-nexgen-accent uppercase tracking-wider">
                      {m.phase}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      m.status === 'active'
                        ? 'bg-nexgen-accent/20 text-nexgen-accent'
                        : 'bg-nexgen-green/20 text-nexgen-green'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-nexgen-text mb-1.5">
                    {m.title}
                  </h4>
                  <p className="text-xs text-nexgen-muted leading-relaxed">
                    {m.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </MotionSection>
  )
}
