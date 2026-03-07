'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { Terminal as TerminalIcon, Server } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { getSSHHosts } from '@/services/api'
import { clsx } from 'clsx'
import type { SSHHost } from '@/types'

export default function SSHTerminalPage() {
  const { token } = useAuth()
  const fetcher = useCallback(() => getSSHHosts(), [])
  const { data, loading } = useApi<{ hosts: SSHHost[] }>(fetcher)
  const [selectedHost, setSelectedHost] = useState<SSHHost | null>(null)
  const [connected, setConnected] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const termRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const termInstanceRef = useRef<unknown>(null)

  const hosts = data?.hosts ?? []

  const connect = useCallback(async (host: SSHHost) => {
    setSelectedHost(host)
    setConnected(false)
    setStatusMsg('Loading terminal...')

    // Dynamic import xterm to avoid SSR issues
    const { Terminal } = await import('@xterm/xterm')
    const { FitAddon } = await import('@xterm/addon-fit')

    if (termInstanceRef.current) {
      (termInstanceRef.current as { dispose: () => void }).dispose()
    }

    const term = new Terminal({
      theme: {
        background: '#0a0e17',
        foreground: '#e2e8f0',
        cursor: '#8b5cf6',
        selectionBackground: '#8b5cf633',
        black: '#0a0e17',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#38bdf8',
        magenta: '#8b5cf6',
        cyan: '#06b6d4',
        white: '#e2e8f0',
      },
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 13,
      cursorBlink: true,
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)

    if (termRef.current) {
      termRef.current.innerHTML = ''
      term.open(termRef.current)
      fitAddon.fit()
    }

    termInstanceRef.current = term

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/api/ssh/connect?token=${token}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    setStatusMsg(`Connecting to ${host.host}:${host.port}...`)

    ws.onopen = () => {
      ws.send(JSON.stringify({
        host: host.host,
        port: host.port,
        username: host.username,
      }))
    }

    ws.onmessage = (event) => {
      const msg = event.data
      // Try parsing as JSON control message
      try {
        const parsed = JSON.parse(msg)
        if (parsed.type === 'connected') {
          setConnected(true)
          setStatusMsg('')
          term.focus()
          return
        }
        if (parsed.type === 'status') {
          setStatusMsg(parsed.message)
          return
        }
        if (parsed.type === 'error') {
          setStatusMsg(`Error: ${parsed.message}`)
          return
        }
      } catch {
        // Not JSON — raw terminal output
      }
      term.write(msg)
    }

    ws.onclose = () => {
      setConnected(false)
      setStatusMsg('Disconnected')
      term.write('\r\n\x1b[31mConnection closed.\x1b[0m\r\n')
    }

    ws.onerror = () => {
      setStatusMsg('WebSocket error')
    }

    // Forward terminal input to WebSocket
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data)
      }
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      }
    })
    if (termRef.current) {
      resizeObserver.observe(termRef.current)
    }

    return () => {
      resizeObserver.disconnect()
      ws.close()
      term.dispose()
    }
  }, [token])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
      if (termInstanceRef.current) {
        (termInstanceRef.current as { dispose: () => void }).dispose()
      }
    }
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
        <TerminalIcon size={22} className="text-nexgen-accent" />
        SSH Terminal
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Host List */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold text-nexgen-text mb-4">Available Hosts</h3>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-10 bg-nexgen-border/20 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-1">
              {hosts.map((host) => (
                <button
                  key={host.name}
                  onClick={() => connect(host)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-colors',
                    selectedHost?.name === host.name
                      ? 'bg-nexgen-accent/10 text-nexgen-accent border border-nexgen-accent/20'
                      : 'text-nexgen-muted hover:text-nexgen-text hover:bg-nexgen-card',
                  )}
                >
                  <Server size={14} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate">{host.name}</p>
                    <p className="text-[10px] text-nexgen-muted">{host.group}</p>
                  </div>
                </button>
              ))}
              {hosts.length === 0 && <p className="text-xs text-nexgen-muted text-center py-4">No SSH hosts configured</p>}
            </div>
          )}
        </div>

        {/* Terminal Area */}
        <div className="lg:col-span-3 glass-card p-5 flex flex-col min-h-[500px]">
          {selectedHost ? (
            <>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-nexgen-border/20">
                <span className={clsx('w-2 h-2 rounded-full', connected ? 'bg-nexgen-green animate-pulse' : 'bg-nexgen-muted')} />
                <span className="text-xs font-mono text-nexgen-text">{selectedHost.username}@{selectedHost.host}:{selectedHost.port}</span>
                <span className="ml-auto text-[10px] text-nexgen-muted font-mono">{selectedHost.group}</span>
              </div>
              {statusMsg && (
                <p className="text-xs text-nexgen-muted mb-2 font-mono">{statusMsg}</p>
              )}
              <div ref={termRef} className="flex-1 rounded-lg overflow-hidden" />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <TerminalIcon size={48} className="text-nexgen-border mx-auto mb-4" />
                <h3 className="text-sm text-nexgen-muted mb-1">Select a Host</h3>
                <p className="text-xs text-nexgen-muted/60">Choose a server from the list to open an SSH session.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
