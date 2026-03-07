'use client'

import { useState } from 'react'
import { Key, Plus, Copy, Trash2, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useRBAC } from '@/hooks/useRBAC'
import { clsx } from 'clsx'

interface APIKey {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used: string | null
  scopes: string[]
  active: boolean
}

const mockKeys: APIKey[] = [
  { id: '1', name: 'CI/CD Pipeline', prefix: 'byr_live_abc1', created_at: '2026-02-15T10:00:00Z', last_used: '2026-03-06T14:30:00Z', scopes: ['vm:action', 'service:deploy'], active: true },
  { id: '2', name: 'Monitoring Integration', prefix: 'byr_live_def2', created_at: '2026-01-20T08:00:00Z', last_used: '2026-03-07T09:12:00Z', scopes: ['metrics:read', 'alerts:read'], active: true },
  { id: '3', name: 'Legacy Script', prefix: 'byr_test_ghi3', created_at: '2025-11-01T12:00:00Z', last_used: null, scopes: ['vm:action'], active: false },
]

const availableScopes = [
  'vm:read', 'vm:action', 'vm:create',
  'metrics:read', 'alerts:read', 'alerts:resolve',
  'service:deploy', 'db:backup',
  'audit:read', 'users:read',
]

export default function APIKeysPage() {
  const { can } = useRBAC()
  const [keys, setKeys] = useState(mockKeys)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([])
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = () => {
    const key: APIKey = {
      id: crypto.randomUUID(),
      name: newKeyName,
      prefix: `byr_live_${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      last_used: null,
      scopes: newKeyScopes,
      active: true,
    }
    setKeys((prev) => [key, ...prev])
    setCreatedKey(`byr_live_${crypto.randomUUID().replace(/-/g, '')}`)
    setNewKeyName('')
    setNewKeyScopes([])
    setShowCreate(false)
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRevoke = (id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: false } : k)))
  }

  if (!can('api_keys:manage')) {
    return (
      <div className="glass-card p-12 text-center">
        <Key size={40} className="text-nexgen-muted mx-auto mb-4" />
        <h3 className="text-sm font-semibold text-nexgen-text mb-2">Access Denied</h3>
        <p className="text-xs text-nexgen-muted">You need platform admin privileges to manage API keys.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
          <Key size={22} className="text-nexgen-accent" />
          API Keys
        </h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-xs py-2 px-4">
          <Plus size={14} /> Create Key
        </button>
      </div>

      {/* Created key banner */}
      {createdKey && (
        <div className="glass-card p-4 border-nexgen-green/30 bg-nexgen-green/5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-nexgen-green flex items-center gap-1">
              <CheckCircle2 size={14} /> API Key Created
            </span>
            <button onClick={() => setCreatedKey(null)} className="text-nexgen-muted hover:text-nexgen-text">
              <Eye size={14} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-nexgen-bg px-3 py-2 rounded-lg text-xs font-mono text-nexgen-text select-all">
              {createdKey}
            </code>
            <button onClick={() => handleCopy(createdKey)} className="p-2 rounded-lg bg-nexgen-card hover:bg-nexgen-border/30 transition-colors">
              {copied ? <CheckCircle2 size={14} className="text-nexgen-green" /> : <Copy size={14} className="text-nexgen-muted" />}
            </button>
          </div>
          <p className="text-[10px] text-nexgen-muted mt-2">Copy this key now. It won&apos;t be shown again.</p>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="glass-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-nexgen-text">New API Key</h3>
          <div>
            <label className="block text-xs text-nexgen-muted mb-1.5">Name</label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., CI/CD Pipeline"
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-4 py-2.5 text-sm text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            />
          </div>
          <div>
            <label className="block text-xs text-nexgen-muted mb-1.5">Scopes</label>
            <div className="flex flex-wrap gap-2">
              {availableScopes.map((scope) => (
                <button
                  key={scope}
                  onClick={() =>
                    setNewKeyScopes((prev) =>
                      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
                    )
                  }
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-[10px] font-mono border transition-colors',
                    newKeyScopes.includes(scope)
                      ? 'bg-nexgen-accent/10 border-nexgen-accent/30 text-nexgen-accent'
                      : 'border-nexgen-border/30 text-nexgen-muted hover:text-nexgen-text',
                  )}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!newKeyName} className="btn-primary text-xs py-2 px-4 disabled:opacity-50">
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary text-xs py-2 px-4">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Key list */}
      <div className="space-y-3">
        {keys.map((key) => (
          <div key={key.id} className={clsx('glass-card p-5', !key.active && 'opacity-50')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Key size={16} className={key.active ? 'text-nexgen-accent' : 'text-nexgen-muted'} />
                <div>
                  <h3 className="text-sm font-semibold text-nexgen-text">{key.name}</h3>
                  <p className="text-[10px] font-mono text-nexgen-muted">{key.prefix}...****</p>
                </div>
                <span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-mono', key.active ? 'bg-nexgen-green/10 text-nexgen-green' : 'bg-nexgen-red/10 text-nexgen-red')}>
                  {key.active ? 'Active' : 'Revoked'}
                </span>
              </div>
              {key.active && (
                <button onClick={() => handleRevoke(key.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-nexgen-red/10 text-nexgen-red text-xs hover:bg-nexgen-red/20 transition-colors">
                  <Trash2 size={12} /> Revoke
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {key.scopes.map((scope) => (
                <span key={scope} className="px-2 py-0.5 rounded-full bg-nexgen-card text-[10px] font-mono text-nexgen-muted">
                  {scope}
                </span>
              ))}
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-nexgen-muted">
              <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
              <span>Last used: {key.last_used ? new Date(key.last_used).toLocaleDateString() : 'Never'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
