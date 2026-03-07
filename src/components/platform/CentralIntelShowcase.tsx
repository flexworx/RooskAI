'use client'

import { MessageSquare, Cog, CheckCircle2, ArrowDown } from 'lucide-react'
import { MotionSection, MotionDiv, fadeInUp } from '@/components/ui/motion'

const flow = [
  {
    icon: MessageSquare,
    step: '01',
    title: 'Natural Language Command',
    description: 'Operators speak to the platform in plain English. "Deploy a PostgreSQL replica on VLAN 20 with 8GB RAM."',
    example: '> Deploy a PostgreSQL replica on VLAN 20',
  },
  {
    icon: Cog,
    step: '02',
    title: 'AI Interpretation & Planning',
    description: 'CentralIntel.ai parses intent, validates against policy, sanitizes sensitive data, and generates a structured action plan via AWS Bedrock.',
    example: 'Action: vm.create → db.provision → network.assign',
  },
  {
    icon: CheckCircle2,
    step: '03',
    title: 'Automated Execution',
    description: 'The orchestration engine executes the plan: provisions the VM through Proxmox, configures networking, deploys PostgreSQL, and sets up replication.',
    example: 'VM-DB-02 online, replication streaming, VLAN 20 attached',
  },
]

export function CentralIntelShowcase() {
  return (
    <MotionSection className="section-padding bg-nexgen-surface/50">
      <div className="section-container">
        <MotionDiv className="text-center mb-16">
          <span className="text-xs font-mono text-nexgen-accent uppercase tracking-[0.2em] mb-4 block">
            How It Works
          </span>
          <h2 className="heading-lg mb-4">
            From conversation to
            <br />
            <span className="gradient-text">infrastructure in seconds.</span>
          </h2>
        </MotionDiv>

        <div className="max-w-2xl mx-auto space-y-2">
          {flow.map((step, i) => (
            <div key={step.step}>
              <MotionDiv
                variants={fadeInUp}
                className="glass-card p-6 relative"
              >
                <div className="flex items-start gap-5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nexgen-accent to-nexgen-blue flex items-center justify-center shrink-0">
                    <step.icon size={18} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono text-nexgen-accent uppercase tracking-wider">
                        Step {step.step}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-nexgen-text mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-nexgen-muted leading-relaxed mb-3">
                      {step.description}
                    </p>
                    <div className="px-4 py-2.5 rounded-lg bg-nexgen-bg border border-nexgen-border/30 font-mono text-xs text-nexgen-accent">
                      {step.example}
                    </div>
                  </div>
                </div>
              </MotionDiv>
              {i < flow.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown size={16} className="text-nexgen-border" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </MotionSection>
  )
}
