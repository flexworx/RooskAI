'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Monitor, Play, Square, Maximize2, Minimize2, ExternalLink,
  RefreshCw, Loader2, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getVMs } from '@/services/api'
import { clsx } from 'clsx'
import type { VM } from '@/types'

// Guacamole connection registry — maps VMIDs to Guacamole connection tokens
// Token format: base64("connectionId\0c\0postgresql")
const GUAC_CONNECTIONS: Record<number, { name: string; token: string; protocol: string }> = {
  114: { name: 'Windows 11 Desktop', token: 'MTMAYwBwb3N0Z3Jlc3Fs', protocol: 'rdp' },
}

const GUAC_BASE = '/guacamole'

export default function RemoteDesktopPage() {
  const [activeVmid, setActiveVmid] = useState<number | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const vmFetcher = useCallback(() => getVMs(), [])
  const { data } = useApi<VM[]>(vmFetcher, 15000)
  const allVms = Array.isArray(data) ? data : []

  // Filter to VMs that have Guacamole connections configured
  const desktopVms = allVms.filter((vm) => GUAC_CONNECTIONS[vm.vmid])

  const activeConn = activeVmid ? GUAC_CONNECTIONS[activeVmid] : null
  const activeVm = activeVmid ? allVms.find((v) => v.vmid === activeVmid) : null

  const guacClientUrl = activeConn
    ? `${GUAC_BASE}/#/client/${activeConn.token}`
    : null

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
      setFullscreen(true)
    } else {
      document.exitFullscreen()
      setFullscreen(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <Monitor size={22} className="text-nexgen-accent" />
          Remote Desktop
        </h1>
        <div className="flex items-center gap-2 text-xs">
          <a
            href={`${GUAC_BASE}/`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-nexgen-border/30 text-nexgen-muted hover:text-nexgen-text transition-colors font-mono"
          >
            <ExternalLink size={12} /> Guacamole Admin
          </a>
        </div>
      </div>

      {/* Desktop cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {desktopVms.map((vm) => {
          const conn = GUAC_CONNECTIONS[vm.vmid]!
          const isActive = vm.vmid === activeVmid
          const isRunning = vm.status === 'running'

          return (
            <button
              key={vm.vmid}
              onClick={() => setActiveVmid(isActive ? null : vm.vmid)}
              className={clsx(
                'text-left glass-card-hover p-5 transition-all',
                isActive && 'ring-2 ring-nexgen-accent/30 bg-nexgen-accent/5',
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-nexgen-accent/10 flex items-center justify-center">
                  <Monitor size={20} className="text-nexgen-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-mono font-semibold text-nexgen-text">{conn.name}</h3>
                  <p className="text-[10px] text-nexgen-muted font-mono">{vm.name} (VMID {vm.vmid})</p>
                </div>
                <span className={clsx(
                  'w-2.5 h-2.5 rounded-full shrink-0',
                  isRunning ? 'bg-nexgen-green animate-pulse' : 'bg-nexgen-red',
                )} />
              </div>

              <div className="space-y-1 text-[11px] text-nexgen-muted font-mono">
                <div className="flex justify-between"><span>Protocol</span><span className="text-nexgen-text uppercase">{conn.protocol}</span></div>
                <div className="flex justify-between"><span>Status</span><span className={isRunning ? 'text-nexgen-green' : 'text-nexgen-red'}>{vm.status}</span></div>
                {vm.cpu_cores && <div className="flex justify-between"><span>CPU</span><span>{vm.cpu_cores} cores</span></div>}
                {vm.ram_mb && <div className="flex justify-between"><span>RAM</span><span>{Math.round(vm.ram_mb / 1024)} GB</span></div>}
                {vm.ip_address && <div className="flex justify-between"><span>IP</span><span>{vm.ip_address}</span></div>}
              </div>

              <div className="mt-3 pt-3 border-t border-nexgen-border/20">
                {isRunning ? (
                  <span className="flex items-center gap-1.5 text-xs text-nexgen-accent font-mono">
                    <Play size={12} /> {isActive ? 'Connected' : 'Click to Connect'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-nexgen-amber font-mono">
                    <AlertTriangle size={12} /> VM is stopped — start it first
                  </span>
                )}
              </div>
            </button>
          )
        })}

        {/* Placeholder for deploying more desktops */}
        <a
          href="/dashboard/services"
          className="glass-card-hover p-5 flex flex-col items-center justify-center min-h-[200px] text-center group"
        >
          <div className="w-12 h-12 rounded-lg bg-nexgen-border/10 flex items-center justify-center mb-3 group-hover:bg-nexgen-accent/10 transition-colors">
            <Monitor size={24} className="text-nexgen-muted group-hover:text-nexgen-accent transition-colors" />
          </div>
          <p className="text-xs font-mono text-nexgen-muted group-hover:text-nexgen-text transition-colors">Deploy New Desktop</p>
          <p className="text-[10px] text-nexgen-muted/60 mt-1">From the Service Catalog</p>
        </a>
      </div>

      {/* Guacamole iframe viewer */}
      {activeVmid && activeVm && guacClientUrl && (
        <div ref={containerRef} className={clsx('glass-card overflow-hidden', fullscreen ? 'fixed inset-0 z-50 rounded-none' : '')}>
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-nexgen-border/20 bg-nexgen-surface">
            <span className={clsx(
              'w-2 h-2 rounded-full',
              activeVm.status === 'running' ? 'bg-nexgen-green animate-pulse' : 'bg-nexgen-red'
            )} />
            <span className="text-xs font-mono text-nexgen-text flex-1">
              {GUAC_CONNECTIONS[activeVmid]?.name} — {activeVm.ip_address || 'IP pending'}
            </span>
            <button
              onClick={() => iframeRef.current?.contentWindow?.location.reload()}
              className="p-1.5 rounded hover:bg-nexgen-card transition-colors text-nexgen-muted hover:text-nexgen-text"
              title="Reload"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded hover:bg-nexgen-card transition-colors text-nexgen-muted hover:text-nexgen-text"
              title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <a
              href={guacClientUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded hover:bg-nexgen-card transition-colors text-nexgen-muted hover:text-nexgen-text"
              title="Open in new tab"
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={() => setActiveVmid(null)}
              className="p-1.5 rounded hover:bg-nexgen-card transition-colors text-nexgen-muted hover:text-nexgen-text"
              title="Disconnect"
            >
              <Square size={14} />
            </button>
          </div>

          {/* Iframe */}
          {activeVm.status === 'running' ? (
            <iframe
              ref={iframeRef}
              src={guacClientUrl}
              className={clsx('w-full border-0', fullscreen ? 'h-[calc(100vh-41px)]' : 'h-[700px]')}
              allow="clipboard-read; clipboard-write"
            />
          ) : (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <AlertTriangle size={40} className="text-nexgen-amber mx-auto mb-4" />
                <h3 className="text-sm font-semibold text-nexgen-text mb-2">VM Not Running</h3>
                <p className="text-xs text-nexgen-muted mb-4">Start the VM from the Virtual Machines page first, then connect here.</p>
                <a href="/dashboard/vms" className="text-xs text-nexgen-accent hover:underline font-mono">Go to VMs &rarr;</a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info about licensing */}
      <div className="glass-card p-5 border-l-2 border-nexgen-amber">
        <h3 className="text-sm font-semibold text-nexgen-text mb-2 flex items-center gap-2">
          <AlertTriangle size={14} className="text-nexgen-amber" /> Windows Licensing Note
        </h3>
        <p className="text-xs text-nexgen-muted leading-relaxed">
          Windows Home licenses cannot be used for Remote Desktop hosting — they only allow the device owner to connect.
          For multi-tenant DaaS with multiple concurrent users, you need <strong className="text-nexgen-text">Windows 10/11 Pro</strong> or
          <strong className="text-nexgen-text"> Enterprise</strong> licenses (which include Remote Desktop Services).
          For more than 2 concurrent RDP sessions, you also need <strong className="text-nexgen-text">RDS CALs</strong> (Client Access Licenses).
          Consider Windows Server with RDS role for true multi-user desktop hosting.
        </p>
      </div>
    </div>
  )
}
