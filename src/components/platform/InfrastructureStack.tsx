'use client'

import { MotionSection, MotionDiv, fadeInUp } from '@/components/ui/motion'
import { Cpu, MemoryStick, HardDrive, Network, Server, Shield } from 'lucide-react'

const specs = [
  { icon: Cpu, label: 'Compute', value: '2x AMD EPYC 9354', detail: '64 cores / 128 threads @ 4.4GHz' },
  { icon: MemoryStick, label: 'Memory', value: '128GB DDR5', detail: '4800MHz ECC RDIMM — expandable to 384GB' },
  { icon: HardDrive, label: 'Storage', value: '11.5TB NVMe', detail: '3x 3.84TB U.2 in ZFS RAIDZ1 — 7.5TB usable' },
  { icon: Network, label: 'Network', value: 'Cisco Catalyst 9500', detail: 'Dual uplinks + Cato SASE edge' },
  { icon: Server, label: 'Hypervisor', value: 'Proxmox VE', detail: 'KVM-based with BOSS-N1 mirrored boot' },
  { icon: Shield, label: 'Security', value: 'Defense in Depth', detail: 'OPNsense + Wazuh + Vault + Keycloak' },
]

export function InfrastructureStack() {
  return (
    <MotionSection className="section-padding bg-nexgen-surface/50">
      <div className="section-container">
        <MotionDiv className="text-center mb-16">
          <span className="text-xs font-mono text-nexgen-accent uppercase tracking-[0.2em] mb-4 block">
            Infrastructure
          </span>
          <h2 className="heading-lg mb-4">
            Dell PowerEdge R7625.
            <br />
            <span className="gradient-text">Purpose-built for AI workloads.</span>
          </h2>
          <p className="body-md max-w-xl mx-auto">
            Every component selected for reliability, performance, and
            enterprise-grade operation under continuous AI-driven management.
          </p>
        </MotionDiv>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {specs.map((spec) => (
            <MotionDiv
              key={spec.label}
              variants={fadeInUp}
              className="glass-card p-6"
            >
              <spec.icon size={20} className="text-nexgen-accent mb-3" />
              <div className="text-[10px] font-mono text-nexgen-muted uppercase tracking-wider mb-1">
                {spec.label}
              </div>
              <div className="text-base font-semibold text-nexgen-text mb-1">
                {spec.value}
              </div>
              <div className="text-xs text-nexgen-muted">
                {spec.detail}
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>
    </MotionSection>
  )
}
