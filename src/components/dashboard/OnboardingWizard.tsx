'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, ArrowRight, X, Server, Shield, Database, Bot, Network } from 'lucide-react'

interface Step {
  id: string
  title: string
  description: string
  icon: React.ComponentType<Record<string, unknown>>
  action: string
  href: string
}

const steps: Step[] = [
  { id: 'infra', title: 'Configure Infrastructure', description: 'Set up your Proxmox hypervisor connection and verify VM inventory.', icon: Server, action: 'Go to VMs', href: '/dashboard/vms' },
  { id: 'network', title: 'Verify Network Segmentation', description: 'Review VLAN configuration: Management, Control Plane, Tenant, DMZ, Storage.', icon: Network, action: 'View Networks', href: '/dashboard/networks' },
  { id: 'security', title: 'Enable Security Monitoring', description: 'Activate Wazuh SIEM integration, configure alert thresholds and response rules.', icon: Shield, action: 'Security Center', href: '/dashboard/security' },
  { id: 'database', title: 'Set Up Database Backups', description: 'Configure PostgreSQL automated backups, ZFS snapshots, and retention policies.', icon: Database, action: 'View Databases', href: '/dashboard/databases' },
  { id: 'ai', title: 'Deploy AI Agents', description: 'Connect AWS Bedrock, configure CentralIntel.ai agents and heartbeat monitoring.', icon: Bot, action: 'AI Agents', href: '/dashboard/ai-agents' },
]

const ONBOARDING_KEY = 'nexgen_onboarding'

export function OnboardingWizard() {
  const [visible, setVisible] = useState(false)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY)
    if (stored === 'dismissed') return
    if (stored) {
      try {
        setCompleted(new Set(JSON.parse(stored)))
      } catch { /* ignore */ }
    }
    setVisible(true)
  }, [])

  const toggleStep = (id: string) => {
    setCompleted((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const dismiss = () => {
    localStorage.setItem(ONBOARDING_KEY, 'dismissed')
    setVisible(false)
  }

  const progress = Math.round((completed.size / steps.length) * 100)

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="glass-card p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-nexgen-text">Welcome to MURPH.AI Operations Center</h3>
            <p className="text-xs text-nexgen-muted mt-0.5">Complete these steps to get your platform fully operational.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-nexgen-accent">{progress}%</span>
            <button onClick={dismiss} className="p-1 rounded hover:bg-nexgen-card transition-colors" title="Dismiss">
              <X size={14} className="text-nexgen-muted" />
            </button>
          </div>
        </div>

        <div className="h-1.5 bg-nexgen-border/20 rounded-full mb-4 overflow-hidden">
          <motion.div
            className="h-full bg-nexgen-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="space-y-2">
          {steps.map((step) => {
            const done = completed.has(step.id)
            return (
              <div
                key={step.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-nexgen-card/30 transition-colors"
              >
                <button onClick={() => toggleStep(step.id)} className="flex-shrink-0">
                  {done ? (
                    <CheckCircle2 size={18} className="text-nexgen-green" />
                  ) : (
                    <Circle size={18} className="text-nexgen-border" />
                  )}
                </button>
                <step.icon size={16} className={done ? 'text-nexgen-muted' : 'text-nexgen-accent'} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${done ? 'text-nexgen-muted line-through' : 'text-nexgen-text'}`}>{step.title}</p>
                  <p className="text-[10px] text-nexgen-muted">{step.description}</p>
                </div>
                {!done && (
                  <a
                    href={step.href}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-nexgen-accent hover:bg-nexgen-accent/10 transition-colors flex-shrink-0"
                  >
                    {step.action} <ArrowRight size={10} />
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
