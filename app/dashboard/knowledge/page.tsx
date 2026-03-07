'use client'

import { useState } from 'react'
import { BookOpen, Search, FileText, Server, Shield, Database, Network, Bot, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

interface KBArticle {
  id: string
  title: string
  category: string
  excerpt: string
  tags: string[]
  updated: string
}

const articles: KBArticle[] = [
  { id: '1', title: 'Getting Started with Byrth Platform', category: 'General', excerpt: 'Overview of platform architecture, initial setup, and first steps for administrators.', tags: ['setup', 'admin'], updated: '2026-03-01' },
  { id: '2', title: 'VM Provisioning via Proxmox', category: 'Infrastructure', excerpt: 'How to create, configure, and manage virtual machines through the dashboard or AI terminal.', tags: ['vm', 'proxmox'], updated: '2026-02-28' },
  { id: '3', title: 'Configuring VLAN Segmentation', category: 'Networking', excerpt: 'Network isolation strategy: Management, Control Plane, Tenant, DMZ, and Storage VLANs.', tags: ['vlan', 'network', 'security'], updated: '2026-02-25' },
  { id: '4', title: 'SOC 2 Compliance Controls', category: 'Compliance', excerpt: 'Complete mapping of SOC 2 Type II controls to platform features and audit evidence.', tags: ['soc2', 'compliance', 'audit'], updated: '2026-03-05' },
  { id: '5', title: 'Database Backup & Recovery', category: 'Database', excerpt: 'Automated backup schedules, ZFS snapshots, point-in-time recovery procedures.', tags: ['backup', 'postgresql', 'recovery'], updated: '2026-02-20' },
  { id: '6', title: 'AI Agent Architecture', category: 'AI/ML', excerpt: 'How CentralIntel.ai agents work: types, capabilities, heartbeat protocol, and command execution.', tags: ['ai', 'agents', 'bedrock'], updated: '2026-03-03' },
  { id: '7', title: 'SSH Terminal Security', category: 'Security', excerpt: 'Allowed network ranges, JWT authentication for WebSocket, audit logging of SSH sessions.', tags: ['ssh', 'security', 'terminal'], updated: '2026-02-15' },
  { id: '8', title: 'Incident Response Runbook', category: 'Security', excerpt: 'Step-by-step procedures for security incidents: isolation, evidence, remediation, reporting.', tags: ['incident', 'security', 'runbook'], updated: '2026-03-06' },
  { id: '9', title: 'API Authentication & Keys', category: 'Development', excerpt: 'JWT token flow, API key scopes, rate limiting, and programmatic access patterns.', tags: ['api', 'auth', 'jwt'], updated: '2026-03-07' },
  { id: '10', title: 'Monitoring & Alerting Setup', category: 'Operations', excerpt: 'Prometheus metrics, Grafana dashboards, alert rules, and notification channels.', tags: ['monitoring', 'prometheus', 'grafana'], updated: '2026-02-22' },
]

const categories = Array.from(new Set(articles.map((a) => a.category)))
const categoryIcons: Record<string, typeof BookOpen> = {
  General: BookOpen, Infrastructure: Server, Networking: Network,
  Compliance: Shield, Database: Database, 'AI/ML': Bot,
  Security: Shield, Development: FileText, Operations: FileText,
}

export default function KnowledgeBasePage() {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = articles.filter((a) => {
    const matchesSearch = !search || a.title.toLowerCase().includes(search.toLowerCase()) || a.tags.some((t) => t.includes(search.toLowerCase()))
    const matchesCategory = !activeCategory || a.category === activeCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <BookOpen size={22} className="text-nexgen-accent" />
          Knowledge Base
        </h1>
        <div className="relative w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexgen-muted" />
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-nexgen-bg border border-nexgen-border/40 rounded-lg text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={clsx('px-3 py-1.5 rounded-lg text-xs transition-colors', !activeCategory ? 'bg-nexgen-accent/20 text-nexgen-accent' : 'text-nexgen-muted hover:text-nexgen-text')}
        >
          All ({articles.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            className={clsx('px-3 py-1.5 rounded-lg text-xs transition-colors', activeCategory === cat ? 'bg-nexgen-accent/20 text-nexgen-accent' : 'text-nexgen-muted hover:text-nexgen-text')}
          >
            {cat} ({articles.filter((a) => a.category === cat).length})
          </button>
        ))}
      </div>

      {/* Article list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((article) => {
          const Icon = categoryIcons[article.category] ?? BookOpen
          return (
            <div key={article.id} className="glass-card-hover p-5 cursor-pointer group">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-nexgen-accent/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-nexgen-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-nexgen-text group-hover:text-nexgen-accent transition-colors">{article.title}</h3>
                    <ChevronRight size={14} className="text-nexgen-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                  <p className="text-xs text-nexgen-muted leading-relaxed mb-2">{article.excerpt}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-wrap gap-1">
                      {article.tags.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-nexgen-card text-[9px] font-mono text-nexgen-muted">{tag}</span>
                      ))}
                    </div>
                    <span className="text-[9px] text-nexgen-muted/60 ml-auto">{article.updated}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="glass-card p-12 text-center">
          <BookOpen size={40} className="text-nexgen-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-nexgen-text mb-2">No Articles Found</h3>
          <p className="text-xs text-nexgen-muted">Try adjusting your search or category filter.</p>
        </div>
      )}
    </div>
  )
}
