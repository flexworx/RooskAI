'use client'

import { useCallback } from 'react'
import { Network, Router } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getNetworkTopology } from '@/services/api'
import type { NetworkTopology } from '@/types'

const vlanColors: Record<string, string> = {
  'vmbr10': 'border-nexgen-accent',
  'vmbr20': 'border-nexgen-blue',
  'vmbr30': 'border-nexgen-green',
  'vmbr40': 'border-nexgen-amber',
  'vmbr50': 'border-nexgen-purple',
}

export function NetworkMap() {
  const fetcher = useCallback(() => getNetworkTopology(), [])
  const { data, loading } = useApi<NetworkTopology>(fetcher, 30000)

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Network size={16} className="text-nexgen-accent" />
          <h3 className="text-sm font-semibold text-nexgen-text">Network Topology</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-nexgen-border/20 rounded-lg" />)}
        </div>
      </div>
    )
  }

  const bridges = data?.bridges ?? []
  const vlans = data?.vlans ?? []
  const allInterfaces = [...bridges, ...vlans]

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <Network size={16} className="text-nexgen-accent" />
        <h3 className="text-sm font-semibold text-nexgen-text">Network Topology</h3>
        <span className="ml-auto text-[10px] text-nexgen-muted font-mono">{data?.source === 'proxmox_live' ? 'Live' : 'Offline'}</span>
      </div>
      <div className="flex items-center justify-center mb-4">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nexgen-accent/10 border border-nexgen-accent/30">
          <Router size={14} className="text-nexgen-accent" />
          <span className="text-xs font-mono text-nexgen-accent">OPNsense Gateway</span>
        </div>
      </div>
      <div className="space-y-2">
        {allInterfaces.length > 0 ? allInterfaces.map((iface) => {
          const color = vlanColors[iface.name] ?? 'border-nexgen-muted'
          return (
            <div key={iface.name} className={`border-l-2 ${color} pl-3 py-2 bg-nexgen-bg/20 rounded-r-lg`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-medium text-nexgen-text">{iface.name} — {iface.type}</span>
                <span className="text-[10px] text-nexgen-muted font-mono">{iface.cidr ?? iface.address ?? 'no address'}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${iface.active ? 'bg-nexgen-green/20 text-nexgen-green' : 'bg-nexgen-red/20 text-nexgen-red'}`}>{iface.active ? 'active' : 'inactive'}</span>
                {iface.bridge_ports && <span className="text-[10px] px-1.5 py-0.5 rounded bg-nexgen-card text-nexgen-muted font-mono">ports: {iface.bridge_ports}</span>}
              </div>
            </div>
          )
        }) : (
          <div className="text-center py-6 text-nexgen-muted text-sm">
            {data?.error ? `Cannot reach Proxmox: ${data.error}` : 'No network interfaces found. Connect Proxmox to view topology.'}
          </div>
        )}
      </div>
    </div>
  )
}
