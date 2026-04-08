'use client'

import { useState, useCallback } from 'react'
import { X, Monitor, Loader2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { getVMs, createGuacConnection } from '@/services/api'
import type { VM } from '@/types'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export function AddConnectionModal({ onClose, onCreated }: Props) {
  const vmFetcher = useCallback(() => getVMs(), [])
  const { data } = useApi<VM[]>(vmFetcher)
  const vms = Array.isArray(data) ? data : []

  const [form, setForm] = useState({
    name: '',
    protocol: 'rdp',
    host: '',
    port: '',
    username: '',
    guac_token: '',
    vmid: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }))

  const defaultPort = { rdp: '3389', vnc: '5900', ssh: '22' }[form.protocol] ?? '3389'

  // Auto-fill host from selected VM
  const handleVmChange = (vmidStr: string) => {
    set('vmid', vmidStr)
    if (!vmidStr) return
    const vm = vms.find((v) => String(v.vmid) === vmidStr)
    if (vm?.ip_address) set('host', vm.ip_address)
    if (!form.name && vm) set('name', `${vm.name} (${form.protocol.toUpperCase()})`)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.host.trim()) {
      setError('Name and Host are required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await createGuacConnection({
        name: form.name.trim(),
        protocol: form.protocol,
        host: form.host.trim(),
        port: form.port ? Number(form.port) : undefined,
        username: form.username.trim() || undefined,
        guac_token: form.guac_token.trim() || undefined,
        vmid: form.vmid ? Number(form.vmid) : undefined,
        notes: form.notes.trim() || undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create connection')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-lg mx-4 p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-nexgen-text flex items-center gap-2">
            <Monitor size={16} className="text-nexgen-accent" />
            Add Remote Desktop Connection
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-nexgen-card transition-colors text-nexgen-muted">
            <X size={16} />
          </button>
        </div>

        {error && (
          <p className="text-xs text-nexgen-red bg-nexgen-red/10 border border-nexgen-red/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="space-y-4">
          {/* Link to VM (optional) */}
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">Link to VM (optional)</label>
            <select
              value={form.vmid}
              onChange={(e) => handleVmChange(e.target.value)}
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            >
              <option value="">— Not linked to a VM —</option>
              {vms.map((vm) => (
                <option key={vm.vmid} value={vm.vmid}>
                  {vm.name} (VMID {vm.vmid}) — {vm.status}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-nexgen-muted mt-1">Linking a VM enables status indicators and auto-fills the host IP.</p>
          </div>

          {/* Protocol */}
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">Protocol *</label>
            <div className="grid grid-cols-3 gap-2">
              {(['rdp', 'vnc', 'ssh'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('protocol', p)}
                  className={`py-2 rounded-lg border text-xs font-mono uppercase transition-colors ${
                    form.protocol === p
                      ? 'border-nexgen-accent/60 bg-nexgen-accent/10 text-nexgen-accent'
                      : 'border-nexgen-border/40 text-nexgen-muted hover:text-nexgen-text'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">Connection Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Windows 11 Desktop"
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            />
          </div>

          {/* Host + Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-nexgen-muted mb-1">Host / IP *</label>
              <input
                value={form.host}
                onChange={(e) => set('host', e.target.value)}
                placeholder="10.20.0.50"
                className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
              />
            </div>
            <div>
              <label className="block text-xs text-nexgen-muted mb-1">Port</label>
              <input
                value={form.port}
                onChange={(e) => set('port', e.target.value)}
                placeholder={defaultPort}
                className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">Username</label>
            <input
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="e.g. Administrator or deploy"
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-xs text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            />
          </div>

          {/* Guacamole token */}
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">
              Guacamole Client Token
              <span className="ml-2 text-nexgen-muted/60">(from Guacamole Admin → Connections)</span>
            </label>
            <input
              value={form.guac_token}
              onChange={(e) => set('guac_token', e.target.value)}
              placeholder="MTMAYwBwb3N0Z3Jlc3Fs…"
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-xs font-mono text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            />
            <p className="text-[10px] text-nexgen-muted mt-1">
              The token appears in the Guacamole URL after /#/client/. Without it, the in-app viewer will not open.
            </p>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim() || !form.host.trim()}
            className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
          >
            {saving ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : 'Add Connection'}
          </button>
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-lg border border-nexgen-border/40 text-nexgen-muted hover:text-nexgen-text transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
