'use client'

import { useCallback, useState, useMemo } from 'react'
import { Server, Plus, Play, Square, RotateCcw, Pause } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getVMs, vmAction } from '@/services/api'
import { DashboardSearch } from '@/components/ui/DashboardSearch'
import { ExportButton } from '@/components/ui/ExportButton'
import { clsx } from 'clsx'
import type { VM } from '@/types'

const statusStyles: Record<string, string> = {
  running: 'status-running',
  stopped: 'status-stopped',
  paused: 'status-warning',
  unknown: 'status-badge bg-nexgen-muted/20 text-nexgen-muted',
}

export default function VirtualMachinesPage() {
  const fetcher = useCallback(() => getVMs(), [])
  const { data, loading, refetch } = useApi<VM[]>(fetcher, 15000)
  const [acting, setActing] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const allVms = Array.isArray(data) ? data : []
  const vms = useMemo(() => {
    if (!search) return allVms
    const q = search.toLowerCase()
    return allVms.filter((vm) =>
      vm.name.toLowerCase().includes(q) ||
      vm.ip_address?.toLowerCase().includes(q) ||
      vm.status.toLowerCase().includes(q) ||
      vm.os_type?.toLowerCase().includes(q)
    )
  }, [allVms, search])

  const handleAction = async (vmId: string, action: string) => {
    setActing(vmId)
    try {
      await vmAction(vmId, action)
      refetch()
    } catch { /* handled by UI */ }
    setActing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <Server size={22} className="text-nexgen-accent" />
          Virtual Machines
        </h1>
        <div className="flex items-center gap-3">
          <DashboardSearch placeholder="Search VMs..." value={search} onChange={setSearch} />
          <ExportButton
            data={vms.map((v) => ({ name: v.name, vmid: v.vmid, status: v.status, ip: v.ip_address, cpu: v.cpu_cores, ram_gb: v.ram_mb ? Math.round(v.ram_mb / 1024) : '', disk_gb: v.disk_gb, vlan: v.vlan, os: v.os_type }))}
            filename="vms-export"
            columns={[{ key: 'name', label: 'Name' }, { key: 'vmid', label: 'VMID' }, { key: 'status', label: 'Status' }, { key: 'ip', label: 'IP Address' }, { key: 'cpu', label: 'CPU Cores' }, { key: 'ram_gb', label: 'RAM (GB)' }, { key: 'disk_gb', label: 'Disk (GB)' }, { key: 'vlan', label: 'VLAN' }, { key: 'os', label: 'OS' }]}
          />
          <button className="btn-primary text-xs py-2 px-4">
            <Plus size={14} /> Create VM
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-nexgen-border/30 rounded w-32 mb-3" />
              <div className="h-3 bg-nexgen-border/20 rounded w-24 mb-2" />
              <div className="h-3 bg-nexgen-border/20 rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vms.map((vm) => (
            <div key={vm.id} className="glass-card-hover p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-mono font-semibold text-nexgen-text">{vm.name}</h3>
                <span className={statusStyles[vm.status] ?? statusStyles['unknown']}>
                  {vm.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-nexgen-muted font-mono mb-4">
                <div className="flex justify-between"><span>VMID</span><span>{vm.vmid}</span></div>
                {vm.cpu_cores && <div className="flex justify-between"><span>CPU</span><span>{vm.cpu_cores} cores</span></div>}
                {vm.ram_mb && <div className="flex justify-between"><span>RAM</span><span>{(vm.ram_mb / 1024).toFixed(0)} GB</span></div>}
                {vm.disk_gb && <div className="flex justify-between"><span>Disk</span><span>{vm.disk_gb} GB</span></div>}
                {vm.vlan && <div className="flex justify-between"><span>VLAN</span><span>{vm.vlan}</span></div>}
                {vm.ip_address && <div className="flex justify-between"><span>IP</span><span>{vm.ip_address}</span></div>}
                {vm.os_type && <div className="flex justify-between"><span>OS</span><span>{vm.os_type}</span></div>}
              </div>

              <div className="flex gap-1.5">
                {vm.status === 'stopped' && (
                  <button onClick={() => handleAction(vm.id, 'start')} disabled={acting === vm.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-nexgen-green/10 text-nexgen-green text-[10px] hover:bg-nexgen-green/20 transition-colors disabled:opacity-50">
                    <Play size={10} /> Start
                  </button>
                )}
                {vm.status === 'running' && (
                  <>
                    <button onClick={() => handleAction(vm.id, 'stop')} disabled={acting === vm.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-nexgen-red/10 text-nexgen-red text-[10px] hover:bg-nexgen-red/20 transition-colors disabled:opacity-50">
                      <Square size={10} /> Stop
                    </button>
                    <button onClick={() => handleAction(vm.id, 'restart')} disabled={acting === vm.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-nexgen-amber/10 text-nexgen-amber text-[10px] hover:bg-nexgen-amber/20 transition-colors disabled:opacity-50">
                      <RotateCcw size={10} /> Restart
                    </button>
                    <button onClick={() => handleAction(vm.id, 'pause')} disabled={acting === vm.id} className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-nexgen-blue/10 text-nexgen-blue text-[10px] hover:bg-nexgen-blue/20 transition-colors disabled:opacity-50">
                      <Pause size={10} /> Pause
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && vms.length === 0 && (
        <div className="glass-card p-12 text-center">
          <Server size={40} className="text-nexgen-muted mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-nexgen-text mb-2">No Virtual Machines</h3>
          <p className="text-xs text-nexgen-muted">Connect Proxmox to sync inventory, or create a VM manually.</p>
        </div>
      )}
    </div>
  )
}
