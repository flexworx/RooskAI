'use client'

import { useCallback, useState } from 'react'
import { Boxes, Rocket } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getServiceTemplates, deployService } from '@/services/api'
import type { ServiceTemplate } from '@/types'

export default function ServiceCatalogPage() {
  const fetcher = useCallback(() => getServiceTemplates(), [])
  const { data, loading } = useApi<ServiceTemplate[]>(fetcher)
  const [deploying, setDeploying] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)

  const templates = Array.isArray(data) ? data : []

  const handleDeploy = async (templateId: string) => {
    setDeploying(templateId)
    setResult(null)
    try {
      const res = await deployService(templateId)
      setResult(`Deployed ${res.template_name} as ${res.vm_name} (VMID ${res.vmid})`)
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Deploy failed')
    }
    setDeploying(null)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
        <Boxes size={22} className="text-nexgen-accent" />
        Service Catalog
      </h1>

      {result && (
        <div className="glass-card p-4 border border-nexgen-accent/30 bg-nexgen-accent/5">
          <p className="text-xs text-nexgen-accent font-mono">{result}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map(i => <div key={i} className="glass-card p-6 animate-pulse"><div className="h-5 bg-nexgen-border/30 rounded w-32" /></div>)}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="glass-card-hover p-5 flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{tmpl.icon}</span>
                <h3 className="text-sm font-semibold text-nexgen-text">{tmpl.name}</h3>
              </div>
              <span className="text-[10px] font-mono text-nexgen-accent uppercase tracking-wider mb-2">{tmpl.category}</span>
              <p className="text-xs text-nexgen-muted mb-3 flex-1">{tmpl.description}</p>
              <div className="flex flex-wrap gap-1 mb-3 text-[10px] font-mono text-nexgen-muted">
                <span className="px-1.5 py-0.5 rounded bg-nexgen-bg border border-nexgen-border/30">{tmpl.vm_config.cores} cores</span>
                <span className="px-1.5 py-0.5 rounded bg-nexgen-bg border border-nexgen-border/30">{(tmpl.vm_config.ram_mb / 1024).toFixed(0)} GB</span>
                <span className="px-1.5 py-0.5 rounded bg-nexgen-bg border border-nexgen-border/30">{tmpl.vm_config.disk_gb} GB</span>
                <span className="px-1.5 py-0.5 rounded bg-nexgen-bg border border-nexgen-border/30">VLAN {tmpl.vm_config.vlan}</span>
              </div>
              <button onClick={() => handleDeploy(tmpl.id)} disabled={deploying === tmpl.id} className="w-full flex items-center justify-center gap-1 py-2 rounded-lg bg-nexgen-accent/10 text-nexgen-accent text-xs hover:bg-nexgen-accent/20 transition-colors disabled:opacity-50">
                <Rocket size={12} /> {deploying === tmpl.id ? 'Deploying...' : 'Deploy'}
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Boxes size={40} className="text-nexgen-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-nexgen-text mb-2">No Service Templates</h3>
          <p className="text-xs text-nexgen-muted">Service templates are loaded from the backend catalog.</p>
        </div>
      )}
    </div>
  )
}
