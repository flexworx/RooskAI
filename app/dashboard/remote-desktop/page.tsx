'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Monitor, Play, Square, Maximize2, Minimize2, ExternalLink,
  RefreshCw, AlertTriangle, Plus, Loader2, Trash2,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getGuacConnections, deleteGuacConnection } from '@/services/api'
import { clsx } from 'clsx'
import type { GuacConnection } from '@/types'
import { AddConnectionModal } from '@/components/dashboard/AddConnectionModal'

const GUAC_BASE = '/guacamole'

export default function RemoteDesktopPage() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetcher = useCallback(() => getGuacConnections(), [])
  const { data, loading, refetch } = useApi<GuacConnection[]>(fetcher, 30000)
  const connections = Array.isArray(data) ? data : []

  const activeConn = connections.find((c) => c.id === activeId) ?? null

  const guacClientUrl = activeConn?.guac_token
    ? `${GUAC_BASE}/#/client/${activeConn.guac_token}`
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

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    if (activeId === id) setActiveId(null)
    try {
      await deleteGuacConnection(id)
      refetch()
    } finally {
      setDeletingId(null)
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
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary text-xs py-2 px-4"
          >
            <Plus size={14} /> Add Connection
          </button>
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

      {/* Connection cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-5 bg-nexgen-border/30 rounded w-40 mb-3" />
              <div className="h-3 bg-nexgen-border/20 rounded w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map((conn) => {
            const isActive = conn.id === activeId
            const isRunning = conn.vm_status === 'running'
            const canConnect = !conn.vmid || isRunning // non-VM connections always connectable

            return (
              <div
                key={conn.id}
                className={clsx(
                  'glass-card-hover p-5 relative group',
                  isActive && 'ring-2 ring-nexgen-accent/30 bg-nexgen-accent/5',
                )}
              >
                {/* Delete button */}
                <button
                  onClick={() => handleDelete(conn.id)}
                  disabled={deletingId === conn.id}
                  className="absolute top-3 right-3 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-nexgen-muted hover:text-nexgen-red"
                  title="Remove connection"
                >
                  {deletingId === conn.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </button>

                <button
                  onClick={() => setActiveId(isActive ? null : conn.id)}
                  disabled={!canConnect || !conn.guac_token}
                  className="w-full text-left"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-nexgen-accent/10 flex items-center justify-center">
                      <Monitor size={20} className="text-nexgen-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-mono font-semibold text-nexgen-text truncate">{conn.name}</h3>
                      <p className="text-[10px] text-nexgen-muted font-mono">
                        {conn.vm_name ? `${conn.vm_name} · ` : ''}{conn.host}
                      </p>
                    </div>
                    {conn.vmid && (
                      <span className={clsx(
                        'w-2.5 h-2.5 rounded-full shrink-0',
                        isRunning ? 'bg-nexgen-green animate-pulse' : 'bg-nexgen-red',
                      )} />
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] text-nexgen-muted font-mono">
                    <div className="flex justify-between">
                      <span>Protocol</span>
                      <span className="text-nexgen-text uppercase">{conn.protocol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Port</span>
                      <span className="text-nexgen-text">{conn.port}</span>
                    </div>
                    {conn.vm_status && (
                      <div className="flex justify-between">
                        <span>VM Status</span>
                        <span className={isRunning ? 'text-nexgen-green' : 'text-nexgen-red'}>
                          {conn.vm_status}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-nexgen-border/20">
                    {!conn.guac_token ? (
                      <span className="flex items-center gap-1.5 text-xs text-nexgen-amber font-mono">
                        <AlertTriangle size={12} /> No Guacamole token — add one to connect
                      </span>
                    ) : !canConnect ? (
                      <span className="flex items-center gap-1.5 text-xs text-nexgen-amber font-mono">
                        <AlertTriangle size={12} /> VM is stopped — start it first
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-nexgen-accent font-mono">
                        <Play size={12} /> {isActive ? 'Connected' : 'Click to Connect'}
                      </span>
                    )}
                  </div>
                </button>
              </div>
            )
          })}

          {/* Add connection card */}
          <button
            onClick={() => setShowAdd(true)}
            className="glass-card-hover p-5 flex flex-col items-center justify-center min-h-[200px] text-center group"
          >
            <div className="w-12 h-12 rounded-lg bg-nexgen-border/10 flex items-center justify-center mb-3 group-hover:bg-nexgen-accent/10 transition-colors">
              <Plus size={24} className="text-nexgen-muted group-hover:text-nexgen-accent transition-colors" />
            </div>
            <p className="text-xs font-mono text-nexgen-muted group-hover:text-nexgen-text transition-colors">
              Add Connection
            </p>
            <p className="text-[10px] text-nexgen-muted/60 mt-1">RDP, VNC, or SSH</p>
          </button>
        </div>
      )}

      {/* Guacamole iframe viewer */}
      {activeId && activeConn && guacClientUrl && (
        <div ref={containerRef} className={clsx('glass-card overflow-hidden', fullscreen ? 'fixed inset-0 z-50 rounded-none' : '')}>
          <div className="flex items-center gap-3 px-4 py-2 border-b border-nexgen-border/20 bg-nexgen-surface">
            <span className={clsx(
              'w-2 h-2 rounded-full',
              activeConn.vm_status === 'running' ? 'bg-nexgen-green animate-pulse' : 'bg-nexgen-blue',
            )} />
            <span className="text-xs font-mono text-nexgen-text flex-1">
              {activeConn.name} — {activeConn.host}:{activeConn.port}
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
              onClick={() => setActiveId(null)}
              className="p-1.5 rounded hover:bg-nexgen-card transition-colors text-nexgen-muted hover:text-nexgen-text"
              title="Disconnect"
            >
              <Square size={14} />
            </button>
          </div>
          <iframe
            ref={iframeRef}
            src={guacClientUrl}
            className={clsx('w-full border-0', fullscreen ? 'h-[calc(100vh-41px)]' : 'h-[700px]')}
            allow="clipboard-read; clipboard-write"
          />
        </div>
      )}

      {/* Info about licensing */}
      <div className="glass-card p-5 border-l-2 border-nexgen-amber">
        <h3 className="text-sm font-semibold text-nexgen-text mb-2 flex items-center gap-2">
          <AlertTriangle size={14} className="text-nexgen-amber" /> Windows Licensing Note
        </h3>
        <p className="text-xs text-nexgen-muted leading-relaxed">
          Windows Home licenses cannot be used for Remote Desktop hosting — they only allow the device owner to connect.
          For multi-tenant DaaS with multiple concurrent users, you need{' '}
          <strong className="text-nexgen-text">Windows 10/11 Pro</strong> or{' '}
          <strong className="text-nexgen-text">Enterprise</strong> licenses.
          For more than 2 concurrent RDP sessions, you also need{' '}
          <strong className="text-nexgen-text">RDS CALs</strong>.
          Consider Windows Server with the RDS role for true multi-user desktop hosting.
        </p>
      </div>

      {showAdd && (
        <AddConnectionModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); refetch() }}
        />
      )}
    </div>
  )
}
