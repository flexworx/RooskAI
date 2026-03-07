'use client'

import { motion } from 'framer-motion'
import { MotionSection, MotionDiv } from '@/components/ui/motion'

const layers = [
  {
    label: 'AI Intelligence Layer',
    color: 'border-nexgen-accent',
    bg: 'bg-nexgen-accent/5',
    items: ['CentralIntel.ai Engine', 'LLM Proxy (Bedrock)', 'Policy Engine', 'Agent Framework'],
  },
  {
    label: 'Control Plane',
    color: 'border-nexgen-blue',
    bg: 'bg-nexgen-blue/5',
    items: ['Platform API', 'Orchestration Engine', 'RBAC & IAM (Keycloak)', 'Audit Pipeline'],
  },
  {
    label: 'Security & Compliance',
    color: 'border-nexgen-purple',
    bg: 'bg-nexgen-purple/5',
    items: ['Wazuh SIEM', 'HashiCorp Vault', 'OPNsense Firewall', 'SOC 2 / NIST Controls'],
  },
  {
    label: 'Infrastructure',
    color: 'border-nexgen-green',
    bg: 'bg-nexgen-green/5',
    items: ['Proxmox VE Hypervisor', 'ZFS RAIDZ1 Storage', 'Cisco Catalyst 9500', 'Cato SASE Edge'],
  },
]

export function ArchitectureDiagram() {
  return (
    <MotionSection className="section-padding bg-nexgen-bg">
      <div className="section-container">
        <MotionDiv className="text-center mb-16">
          <span className="text-xs font-mono text-nexgen-accent uppercase tracking-[0.2em] mb-4 block">
            Architecture
          </span>
          <h2 className="heading-lg mb-4">
            Built from the ground up.
            <br />
            <span className="gradient-text">Every layer AI-aware.</span>
          </h2>
          <p className="body-md max-w-2xl mx-auto">
            Four distinct layers — each with dedicated security boundaries,
            monitoring hooks, and AI integration points. No black boxes.
          </p>
        </MotionDiv>

        <div className="max-w-3xl mx-auto space-y-4">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className={`border ${layer.color} ${layer.bg} rounded-xl p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-nexgen-text">
                  {layer.label}
                </h4>
                <span className="text-[10px] font-mono text-nexgen-muted uppercase tracking-wider">
                  Layer {layers.length - i}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {layer.items.map((item) => (
                  <div
                    key={item}
                    className="px-3 py-2 rounded-lg bg-nexgen-bg/60 border border-nexgen-border/20 text-xs font-mono text-nexgen-muted text-center"
                  >
                    {item}
                  </div>
                ))}
              </div>
              {i < layers.length - 1 && (
                <div className="flex justify-center mt-4">
                  <div className="w-px h-6 bg-nexgen-border/40" />
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </MotionSection>
  )
}
