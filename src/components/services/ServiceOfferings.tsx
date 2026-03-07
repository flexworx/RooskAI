'use client'

import {
  Network, Shield, Database, Server, Activity, Lock,
  Globe, Terminal, Cpu, FileCheck,
} from 'lucide-react'
import { MotionSection, MotionDiv, fadeInUp } from '@/components/ui/motion'

const services = [
  {
    icon: Network,
    title: 'AI-Managed Networking',
    description: 'Automated VLAN configuration, firewall rule management, and carrier intelligence. OPNsense and Cisco Catalyst integration with AI-driven optimization.',
    features: ['VLAN orchestration', 'Dynamic firewall rules', 'Carrier performance analysis', 'Cato SASE integration'],
  },
  {
    icon: Shield,
    title: 'Security Operations Center',
    description: 'Wazuh SIEM with AI-powered alert triage, automated incident response, and continuous threat monitoring. SOC 2 and NIST aligned.',
    features: ['Real-time SIEM', 'Automated triage', 'Incident response runbooks', 'Compliance reporting'],
  },
  {
    icon: Database,
    title: 'Database as a Service',
    description: 'PostgreSQL with automated provisioning, HA replication, point-in-time recovery, and AI-monitored performance optimization.',
    features: ['Automated failover', 'Streaming replication', 'Backup & recovery', 'Query optimization'],
  },
  {
    icon: Server,
    title: 'Infrastructure Provisioning',
    description: 'Describe what you need in plain English. CentralIntel.ai handles VM creation, OS installation, networking, and application deployment.',
    features: ['Natural language provisioning', 'Template library', 'Cloud-init automation', 'Snapshot management'],
  },
  {
    icon: Activity,
    title: 'Predictive Monitoring',
    description: 'Prometheus-based observability with AI-driven anomaly detection. Issues identified before they impact users.',
    features: ['Predictive alerting', 'Grafana dashboards', 'Performance baselines', 'Capacity planning'],
  },
  {
    icon: Lock,
    title: 'Secrets & Identity Management',
    description: 'HashiCorp Vault for secrets, Keycloak for identity. Automated rotation, MFA enforcement, and least-privilege access.',
    features: ['Secret rotation', 'SSO & MFA', 'RBAC enforcement', 'Audit trails'],
  },
  {
    icon: Globe,
    title: 'Edge & SASE Services',
    description: 'Cato Networks SASE with zero-trust network access. Secure connectivity from any location to any resource.',
    features: ['Zero trust access', 'Cloud-native firewall', 'Secure web gateway', 'Remote access VPN'],
  },
  {
    icon: Terminal,
    title: 'Managed DevOps',
    description: 'Gitea for self-hosted Git, CI/CD pipelines, infrastructure-as-code workflows, and automated deployment.',
    features: ['Self-hosted Git', 'CI/CD pipelines', 'IaC workflows', 'Automated deploy'],
  },
  {
    icon: Cpu,
    title: 'AI Compute Services',
    description: 'AWS Bedrock integration today, local GPU inference tomorrow. Intelligent routing between cloud and edge AI.',
    features: ['Bedrock integration', 'Data sanitization', 'GPU-ready architecture', 'Model routing'],
  },
  {
    icon: FileCheck,
    title: 'Compliance Automation',
    description: 'Continuous SOC 2 Type II and NIST SP 800-53 compliance monitoring with automated evidence collection and audit-ready reports.',
    features: ['Continuous monitoring', 'Evidence collection', 'Gap analysis', 'Audit reports'],
  },
]

export function ServiceOfferings() {
  return (
    <MotionSection className="section-padding bg-nexgen-surface/50">
      <div className="section-container">
        <MotionDiv className="text-center mb-16">
          <h2 className="heading-lg mb-4">
            Ten core services.
            <br />
            <span className="gradient-text">All AI-augmented.</span>
          </h2>
        </MotionDiv>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {services.map((service) => (
            <MotionDiv
              key={service.title}
              variants={fadeInUp}
              className="glass-card-hover p-6 group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-nexgen-accent/10 border border-nexgen-accent/20 flex items-center justify-center shrink-0 group-hover:bg-nexgen-accent/20 transition-colors">
                  <service.icon size={18} className="text-nexgen-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-nexgen-text mb-2">
                    {service.title}
                  </h3>
                  <p className="text-sm text-nexgen-muted leading-relaxed mb-3">
                    {service.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {service.features.map((f) => (
                      <span
                        key={f}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-nexgen-bg border border-nexgen-border/30 text-nexgen-muted"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </MotionDiv>
          ))}
        </div>
      </div>
    </MotionSection>
  )
}
