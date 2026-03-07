'use client'

import { useState } from 'react'
import { Settings, KeyRound, Shield, Save, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { changePassword, setupMFA, verifyMFA, disableMFA } from '@/services/api'

export default function SettingsPage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const [mfaSecret, setMfaSecret] = useState<string | null>(null)
  const [mfaUri, setMfaUri] = useState<string | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [mfaMsg, setMfaMsg] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwLoading(true)
    setPwMsg('')
    try {
      await changePassword(currentPassword, newPassword)
      setPwMsg('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : 'Failed')
    }
    setPwLoading(false)
  }

  const handleSetupMFA = async () => {
    setMfaLoading(true)
    setMfaMsg('')
    try {
      const res = await setupMFA()
      setMfaSecret(res.secret)
      setMfaUri(res.provisioning_uri)
      setMfaMsg('Scan the QR code or enter the secret in your authenticator app.')
    } catch (err) {
      setMfaMsg(err instanceof Error ? err.message : 'Failed')
    }
    setMfaLoading(false)
  }

  const handleVerifyMFA = async () => {
    setMfaLoading(true)
    try {
      await verifyMFA(totpCode)
      setMfaMsg('MFA enabled successfully.')
      setMfaSecret(null)
      setTotpCode('')
    } catch (err) {
      setMfaMsg(err instanceof Error ? err.message : 'Invalid code')
    }
    setMfaLoading(false)
  }

  const handleDisableMFA = async () => {
    setMfaLoading(true)
    try {
      await disableMFA(totpCode)
      setMfaMsg('MFA disabled.')
      setTotpCode('')
    } catch (err) {
      setMfaMsg(err instanceof Error ? err.message : 'Invalid code')
    }
    setMfaLoading(false)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
        <Settings size={22} className="text-nexgen-accent" />
        Settings
      </h1>

      {/* Profile */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-nexgen-text mb-4 flex items-center gap-2"><Shield size={16} className="text-nexgen-accent" /> Profile</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="metric-label">Name</span><p className="text-nexgen-text font-mono mt-1">{user?.name ?? '—'}</p></div>
          <div><span className="metric-label">Email</span><p className="text-nexgen-text font-mono mt-1">{user?.email ?? '—'}</p></div>
          <div><span className="metric-label">Role</span><p className="text-nexgen-text font-mono mt-1">{user?.role ?? '—'}</p></div>
          <div><span className="metric-label">MFA</span><p className="text-nexgen-text font-mono mt-1">{user?.mfa_enabled ? 'Enabled' : 'Disabled'}</p></div>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-nexgen-text mb-4 flex items-center gap-2"><KeyRound size={16} className="text-nexgen-accent" /> Change Password</h3>
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full bg-nexgen-bg border border-nexgen-border/50 rounded-lg px-4 py-2.5 text-sm text-nexgen-text font-mono focus:outline-none focus:border-nexgen-accent/50 transition-colors" required autoComplete="current-password" />
          <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="w-full bg-nexgen-bg border border-nexgen-border/50 rounded-lg px-4 py-2.5 text-sm text-nexgen-text font-mono focus:outline-none focus:border-nexgen-accent/50 transition-colors" required minLength={8} autoComplete="new-password" />
          <button type="submit" disabled={pwLoading} className="flex items-center gap-2 px-4 py-2 bg-nexgen-accent/20 border border-nexgen-accent/30 rounded-lg text-nexgen-accent text-xs hover:bg-nexgen-accent/30 transition-colors disabled:opacity-50">
            {pwLoading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Update Password
          </button>
          {pwMsg && <p className="text-xs text-nexgen-accent font-mono">{pwMsg}</p>}
        </form>
      </div>

      {/* MFA */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-nexgen-text mb-4 flex items-center gap-2"><Shield size={16} className="text-nexgen-accent" /> Multi-Factor Authentication</h3>
        {mfaSecret ? (
          <div className="space-y-3">
            <p className="text-xs text-nexgen-muted">{mfaMsg}</p>
            <div className="px-4 py-3 rounded-lg bg-nexgen-bg border border-nexgen-border/30 font-mono text-xs text-nexgen-accent break-all">{mfaSecret}</div>
            <input type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="Enter 6-digit code" className="w-full bg-nexgen-bg border border-nexgen-border/50 rounded-lg px-4 py-2.5 text-center text-lg text-nexgen-text font-mono tracking-[0.5em] focus:outline-none focus:border-nexgen-accent/50 transition-colors" />
            <button onClick={handleVerifyMFA} disabled={mfaLoading || totpCode.length !== 6} className="w-full py-2 bg-nexgen-accent/20 border border-nexgen-accent/30 rounded-lg text-nexgen-accent text-xs hover:bg-nexgen-accent/30 transition-colors disabled:opacity-50">Verify & Enable</button>
          </div>
        ) : (
          <div className="space-y-3">
            {!user?.mfa_enabled ? (
              <button onClick={handleSetupMFA} disabled={mfaLoading} className="flex items-center gap-2 px-4 py-2 bg-nexgen-green/10 border border-nexgen-green/30 rounded-lg text-nexgen-green text-xs hover:bg-nexgen-green/20 transition-colors disabled:opacity-50">
                {mfaLoading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />} Enable MFA
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-nexgen-green flex items-center gap-1"><Shield size={12} /> MFA is enabled</p>
                <input type="text" inputMode="numeric" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))} placeholder="Enter code to disable" className="w-full bg-nexgen-bg border border-nexgen-border/50 rounded-lg px-4 py-2.5 text-center text-sm text-nexgen-text font-mono focus:outline-none focus:border-nexgen-accent/50 transition-colors" />
                <button onClick={handleDisableMFA} disabled={mfaLoading || totpCode.length !== 6} className="flex items-center gap-2 px-4 py-2 bg-nexgen-red/10 border border-nexgen-red/30 rounded-lg text-nexgen-red text-xs hover:bg-nexgen-red/20 transition-colors disabled:opacity-50">Disable MFA</button>
              </div>
            )}
            {mfaMsg && <p className="text-xs text-nexgen-accent font-mono">{mfaMsg}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
