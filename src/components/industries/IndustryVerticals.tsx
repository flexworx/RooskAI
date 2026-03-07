'use client'

import { Heart, Landmark, Zap, Factory, Building, ShieldCheck } from 'lucide-react'
import { MotionSection, MotionDiv, fadeInUp } from '@/components/ui/motion'

const industries = [
  {
    icon: Zap,
    title: 'Energy & Utilities (HSE)',
    subtitle: 'Health, Safety & Environmental Operations',
    description: 'SCADA network monitoring, OT/IT convergence security, environmental compliance tracking, and real-time safety system telemetry.',
    compliance: ['IEC 62443', 'NERC CIP', 'OSHA', 'EPA'],
    color: 'from-nexgen-amber to-nexgen-accent',
  },
  {
    icon: Heart,
    title: 'Healthcare',
    subtitle: 'HIPAA-Compliant Infrastructure',
    description: 'Protected health information stays on-premises. AI monitoring ensures uptime for critical clinical systems with HIPAA-aligned access controls.',
    compliance: ['HIPAA', 'HITECH', 'SOC 2'],
    color: 'from-nexgen-red to-nexgen-purple',
  },
  {
    icon: Landmark,
    title: 'Financial Services',
    subtitle: 'Zero-Trust Banking Infrastructure',
    description: 'Real-time fraud detection integration, PCI DSS compliant network segmentation, and immutable audit trails for regulatory examination.',
    compliance: ['PCI DSS', 'SOX', 'GLBA', 'SOC 2'],
    color: 'from-nexgen-blue to-nexgen-accent',
  },
  {
    icon: Factory,
    title: 'Manufacturing',
    subtitle: 'Industrial Network Intelligence',
    description: 'OT network segmentation, predictive maintenance telemetry, supply chain visibility, and industrial IoT security monitoring.',
    compliance: ['ISO 27001', 'IEC 62443', 'NIST CSF'],
    color: 'from-nexgen-green to-nexgen-blue',
  },
  {
    icon: Building,
    title: 'Government & Public Sector',
    subtitle: 'FedRAMP-Ready Architecture',
    description: 'NIST SP 800-53 controls enforced at every layer. Classified network segmentation with continuous compliance monitoring.',
    compliance: ['NIST 800-53', 'FedRAMP', 'FISMA', 'CMMC'],
    color: 'from-nexgen-purple to-nexgen-accent',
  },
  {
    icon: ShieldCheck,
    title: 'Professional Services',
    subtitle: 'Multi-Tenant Client Infrastructure',
    description: 'Isolated environments per client engagement, SOC 2 compliance for consulting firms, and AI-driven resource optimization.',
    compliance: ['SOC 2', 'ISO 27001', 'GDPR'],
    color: 'from-nexgen-accent to-nexgen-green',
  },
]

export function IndustryVerticals() {
  return (
    <MotionSection className="section-padding bg-nexgen-surface/50">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {industries.map((ind) => (
            <MotionDiv
              key={ind.title}
              variants={fadeInUp}
              className="glass-card-hover p-6 group flex flex-col"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${ind.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <ind.icon size={22} className="text-white" />
              </div>
              <h3 className="text-base font-semibold text-nexgen-text mb-1">
                {ind.title}
              </h3>
              <p className="text-[10px] font-mono text-nexgen-accent uppercase tracking-wider mb-3">
                {ind.subtitle}
              </p>
              <p className="text-sm text-nexgen-muted leading-relaxed mb-4 flex-1">
                {ind.description}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {ind.compliance.map((c) => (
                  <span
                    key={c}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-nexgen-border/30 text-nexgen-muted"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>
    </MotionSection>
  )
}
