'use client'

import { useCallback } from 'react'
import { Network, Router, HardDrive } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getNetworkTopology, getNetworkStorage } from '@/services/api'
import { clsx } from 'clsx'
import type { NetworkTopology, StorageInfo } from '@/types'

const vlanColors: Record<string, string> = {
  'vmbr10': 'border-nexgen-accent',
  'vmbr20': 'border-nexgen-blue',
  'vmbr30': 'border-nexgen-green',
  'vmbr40': 'border-nexgen-amber',
  'vmbr50': 'border-nexgen-purple',
}

export default function NetworkControlPage() {
  const topoFetcher = useCallback(() => getNetworkTopology(), [])
  const storageFetcher = useCallback(() => getNetworkStorage(), [])
  const { data: topo, loading: topoLoading } = useApi<NetworkTopology>(topoFetcher, 30000)
  const { data: storage, loading: storageLoading } = useApi<StorageInfo>(storageFetcher, 30000)

  const allInterfaces = [...(topo?.bridges ?? []), ...(topo?.vlans ?? [])]
  const pools = storage?.pools ?? []

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
        <Network size={22} className="text-nexgen-accent" />
        Network Control
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Topology */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Router size={16} className="text-nexgen-accent" />
            <h3 className="text-sm font-semibold text-nexgen-text">Network Topology</h3>
            <span className="ml-auto text-[10px] font-mono text-nexgen-muted">{topo?.source === 'proxmox_live' ? 'Live' : 'Offline'}</span>
          </div>

          {topoLoading ? (
            <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-nexgen-border/20 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-center mb-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nexgen-accent/10 border border-nexgen-accent/30">
                  <Router size={14} className="text-nexgen-accent" />
                  <span className="text-xs font-mono text-nexgen-accent">OPNsense Gateway</span>
                </div>
              </div>
              {allInterfaces.map((iface) => {
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
              })}
              {allInterfaces.length === 0 && <div className="text-center py-6 text-nexgen-muted text-sm">{topo?.error ? `Error: ${topo.error}` : 'No interfaces found'}</div>}
            </div>
          )}
        </div>

        {/* Storage Pools */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <HardDrive size={16} className="text-nexgen-accent" />
            <h3 className="text-sm font-semibold text-nexgen-text">Storage Pools</h3>
          </div>

          {storageLoading ? (
            <div className="animate-pulse space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-nexgen-border/20 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-3">
              {pools.map((pool) => {
                const usedPct = pool.total_bytes > 0 ? (pool.used_bytes / pool.total_bytes) * 100 : 0
                return (
                  <div key={pool.storage} className="bg-nexgen-bg/30 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono font-medium text-nexgen-text">{pool.storage}</span>
                      <span className="text-[10px] font-mono text-nexgen-muted">{pool.type} — {pool.content}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-nexgen-border/30 rounded-full overflow-hidden">
                        <div className={clsx('h-full rounded-full', usedPct > 90 ? 'bg-nexgen-red' : usedPct > 70 ? 'bg-nexgen-amber' : 'bg-nexgen-green')} style={{ width: `${usedPct}%` }} />
                      </div>
                      <span className="text-[10px] font-mono text-nexgen-muted">{(pool.used_bytes / 1e9).toFixed(1)}GB / {(pool.total_bytes / 1e9).toFixed(1)}GB</span>
                    </div>
                  </div>
                )
              })}
              {pools.length === 0 && <div className="text-center py-6 text-nexgen-muted text-sm">No storage pools detected</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
