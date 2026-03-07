'use client'

import { Shield, Lock, FileCheck, Eye, Server, KeyRound } from 'lucide-react'
import { MotionSection, MotionDiv, fadeInUp } from '@/components/ui/motion'

const controls = [
  { icon: Shield, label: 'SOC 2 Type II', desc: 'Full control framework with continuous audit evidence' },
  { icon: Lock, label: 'NIST SP 800-53', desc: 'Federal-grade security controls mapped to every service' },
  { icon: FileCheck, label: 'Immutable Audit Log', desc: 'Every action timestamped, attributed, and stored' },
  { icon: Eye, label: 'Zero Trust Architecture', desc: 'No implicit trust — identity verified at every boundary' },
  { icon: Server, label: 'Encrypted at Rest & Transit', desc: 'TLS 1.3 everywhere, AES-256 for stored data' },
  { icon: KeyRound, label: 'MFA Enforced', desc: 'TOTP-based multi-factor on all privileged access' },
]

export function ComplianceBanner() {
  return (
    <MotionSection className="section-padding bg-nexgen-surface/50">
      <div className="section-container">
        <MotionDiv className="text-center mb-12">
          <span className="text-xs font-mono text-nexgen-green uppercase tracking-[0.2em] mb-4 block">
            Security & Compliance
          </span>
          <h2 className="heading-lg mb-4">
            Compliance is not a checkbox.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-nexgen-green to-nexgen-accent">
              It is the architecture.
            </span>
          </h2>
        </MotionDiv>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {controls.map((control) => (
            <MotionDiv
              key={control.label}
              variants={fadeInUp}
              className="glass-card p-6 border-nexgen-green/10 hover:border-nexgen-green/30 transition-colors"
            >
              <control.icon size={20} className="text-nexgen-green mb-3" />
              <h4 className="text-sm font-semibold text-nexgen-text mb-1.5">
                {control.label}
              </h4>
              <p className="text-xs text-nexgen-muted leading-relaxed">
                {control.desc}
              </p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </MotionSection>
  )
}
