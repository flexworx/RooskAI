'use client'

import { Target, Eye, Lightbulb } from 'lucide-react'
import { MotionSection, MotionDiv, fadeInUp } from '@/components/ui/motion'

const values = [
  {
    icon: Target,
    title: 'Mission',
    description:
      'Eliminate reactive infrastructure management. Replace human-speed response with AI-speed intelligence. Make enterprise-grade security accessible to every organization.',
  },
  {
    icon: Eye,
    title: 'Vision',
    description:
      'A world where infrastructure is invisible — operating autonomously, healing itself, and adapting to demand without human intervention. CentralIntel.ai is the first step.',
  },
  {
    icon: Lightbulb,
    title: 'Approach',
    description:
      'Build on proven enterprise components — Proxmox, PostgreSQL, OPNsense, HashiCorp Vault — and add an AI intelligence layer that makes them work together as one.',
  },
]

export function Mission() {
  return (
    <MotionSection className="section-padding bg-nexgen-surface/50">
      <div className="section-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {values.map((v) => (
            <MotionDiv
              key={v.title}
              variants={fadeInUp}
              className="glass-card p-8 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-nexgen-accent/10 border border-nexgen-accent/20 flex items-center justify-center mx-auto mb-5">
                <v.icon size={22} className="text-nexgen-accent" />
              </div>
              <h3 className="heading-md mb-3">{v.title}</h3>
              <p className="body-md">{v.description}</p>
            </MotionDiv>
          ))}
        </div>
      </div>
    </MotionSection>
  )
}
