'use client'

import { useState } from 'react'
import { PlayCircle, Plus, Clock, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import { clsx } from 'clsx'

interface Runbook {
  id: string
  name: string
  description: string
  trigger: 'manual' | 'alert' | 'schedule' | 'threshold'
  steps: { action: string; target: string }[]
  last_run: string | null
  status: 'ready' | 'running' | 'completed' | 'failed'
}

const runbooks: Runbook[] = [
  {
    id: '1', name: 'High CPU Response', description: 'Identify and remediate high CPU usage on VMs',
    trigger: 'threshold', status: 'ready', last_run: '2026-03-06T10:30:00Z',
    steps: [
      { action: 'Check top processes', target: 'Affected VM' },
      { action: 'Kill runaway process if safe', target: 'PID > 90% CPU' },
      { action: 'Scale up if persistent', target: 'Add 2 vCPUs' },
      { action: 'Notify team', target: 'Slack #incidents' },
    ],
  },
  {
    id: '2', name: 'Database Failover', description: 'Automated failover to replica on primary failure',
    trigger: 'alert', status: 'ready', last_run: null,
    steps: [
      { action: 'Verify primary is unreachable', target: 'VM-DB-01' },
      { action: 'Promote replica to primary', target: 'VM-DB-02' },
      { action: 'Update DNS/connection strings', target: 'App configs' },
      { action: 'Page on-call DBA', target: 'PagerDuty' },
    ],
  },
  {
    id: '3', name: 'SSL Certificate Renewal', description: 'Renew and deploy SSL certificates',
    trigger: 'schedule', status: 'completed', last_run: '2026-03-01T02:00:00Z',
    steps: [
      { action: 'Run certbot renew', target: 'Nginx container' },
      { action: 'Reload nginx', target: 'docker exec nginx nginx -s reload' },
      { action: 'Verify certificate', target: 'openssl s_client' },
    ],
  },
  {
    id: '4', name: 'Security Incident Response', description: 'Isolate compromised host and preserve evidence',
    trigger: 'manual', status: 'ready', last_run: null,
    steps: [
      { action: 'Isolate host (disable network)', target: 'Affected VM' },
      { action: 'Snapshot VM for forensics', target: 'Proxmox snapshot' },
      { action: 'Scan with Wazuh', target: 'VM-SIEM-01' },
      { action: 'Rotate affected credentials', target: 'Vault' },
      { action: 'Create incident report', target: 'Compliance log' },
    ],
  },
]

const triggerIcons = { manual: PlayCircle, alert: AlertTriangle, schedule: Clock, threshold: Zap }
const triggerColors = { manual: 'text-nexgen-accent', alert: 'text-nexgen-red', schedule: 'text-nexgen-blue', threshold: 'text-nexgen-amber' }

export default function RunbooksPage() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <PlayCircle size={22} className="text-nexgen-accent" />
          Runbooks
        </h1>
        <button className="btn-primary text-xs py-2 px-4"><Plus size={14} /> Create Runbook</button>
      </div>

      <div className="space-y-3">
        {runbooks.map((rb) => {
          const TriggerIcon = triggerIcons[rb.trigger]
          return (
            <div key={rb.id} className="glass-card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === rb.id ? null : rb.id)}
                className="w-full p-5 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <TriggerIcon size={18} className={triggerColors[rb.trigger]} />
                  <div>
                    <h3 className="text-sm font-semibold text-nexgen-text">{rb.name}</h3>
                    <p className="text-xs text-nexgen-muted">{rb.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-mono',
                    rb.status === 'ready' ? 'bg-nexgen-green/10 text-nexgen-green' :
                    rb.status === 'running' ? 'bg-nexgen-accent/10 text-nexgen-accent' :
                    rb.status === 'completed' ? 'bg-nexgen-blue/10 text-nexgen-blue' :
                    'bg-nexgen-red/10 text-nexgen-red'
                  )}>{rb.status}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-nexgen-card text-nexgen-muted font-mono">{rb.trigger}</span>
                </div>
              </button>

              {expanded === rb.id && (
                <div className="px-5 pb-5 border-t border-nexgen-border/10 pt-4">
                  <div className="space-y-2 mb-4">
                    {rb.steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-nexgen-accent/10 text-nexgen-accent text-[10px] font-mono flex items-center justify-center flex-shrink-0">{i + 1}</span>
                        <div className="flex-1">
                          <span className="text-xs text-nexgen-text">{step.action}</span>
                          <span className="text-[10px] text-nexgen-muted ml-2">→ {step.target}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-nexgen-muted">
                      Last run: {rb.last_run ? new Date(rb.last_run).toLocaleString() : 'Never'}
                    </span>
                    <button className="btn-primary text-xs py-1.5 px-4">
                      <PlayCircle size={12} /> Execute
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
