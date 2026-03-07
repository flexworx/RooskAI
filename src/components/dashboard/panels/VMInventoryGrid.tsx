'use client'

import { Server, Play, Square, Pause } from 'lucide-react'
import type { VM } from '@/types'

interface Props {
  vms: VM[]
}

const statusConfig: Record<string, { icon: typeof Play; class: string }> = {
  running: { icon: Play, class: 'status-running' },
  stopped: { icon: Square, class: 'status-stopped' },
  paused: { icon: Pause, class: 'status-warning' },
  unknown: { icon: Server, class: 'status-badge bg-nexgen-muted/20 text-nexgen-muted' },
}

export function VMInventoryGrid({ vms }: Props) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-nexgen-text flex items-center gap-2">
          <Server size={16} className="text-nexgen-accent" />
          VM Inventory
        </h3>
        <span className="text-xs text-nexgen-muted font-mono">{vms.length} VMs</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {vms.map((vm) => {
          const cfg = statusConfig[vm.status] ?? statusConfig['unknown']!
          const StatusIcon = cfg.icon
          return (
            <div
              key={vm.id}
              className="bg-nexgen-bg/50 border border-nexgen-border/30 rounded-lg p-3 hover:border-nexgen-accent/20 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono font-medium text-nexgen-text">{vm.name}</span>
                <span className={cfg.class}>
                  <StatusIcon size={10} className="mr-1" />
                  {vm.status}
                </span>
              </div>
              <div className="space-y-1 text-[11px] text-nexgen-muted font-mono">
                <div className="flex justify-between"><span>VMID</span><span>{vm.vmid}</span></div>
                {vm.cpu_cores && <div className="flex justify-between"><span>CPU</span><span>{vm.cpu_cores} cores</span></div>}
                {vm.ram_mb && <div className="flex justify-between"><span>RAM</span><span>{(vm.ram_mb / 1024).toFixed(0)}GB</span></div>}
                {vm.vlan && <div className="flex justify-between"><span>VLAN</span><span>{vm.vlan}</span></div>}
              </div>
            </div>
          )
        })}
      </div>

      {vms.length === 0 && (
        <div className="text-center py-8 text-nexgen-muted text-sm">
          No VMs configured. Connect Proxmox to sync inventory.
        </div>
      )}
    </div>
  )
}
