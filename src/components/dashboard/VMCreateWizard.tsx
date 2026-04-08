'use client'

import { useState } from 'react'
import { X, Server, ChevronRight, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react'
import { createVM } from '@/services/api'

interface Props {
  onClose: () => void
  onCreated: () => void
}

type Step = 'os' | 'size' | 'network' | 'review'

const OS_OPTIONS = [
  { id: 'ubuntu-22.04', label: 'Ubuntu 22.04 LTS', desc: 'Recommended for servers, Docker, and AI workloads', icon: '🐧' },
  { id: 'ubuntu-24.04', label: 'Ubuntu 24.04 LTS', desc: 'Latest Ubuntu release', icon: '🐧' },
  { id: 'debian-12',   label: 'Debian 12 Bookworm', desc: 'Stable, minimal, great for long-lived services', icon: '🌀' },
  { id: 'win11',       label: 'Windows 11', desc: 'Desktop OS — requires ISO attachment after creation', icon: '🪟' },
  { id: 'freebsd',     label: 'FreeBSD 14', desc: 'Advanced networking and ZFS support', icon: '😈' },
]

const SIZE_PRESETS = [
  { id: 'micro',  label: 'Micro',   desc: 'Lightweight services',    cores: 1, ram_gb: 1,  disk_gb: 10 },
  { id: 'small',  label: 'Small',   desc: 'Basic apps and services', cores: 2, ram_gb: 4,  disk_gb: 40 },
  { id: 'medium', label: 'Medium',  desc: 'General-purpose workloads', cores: 4, ram_gb: 8, disk_gb: 80 },
  { id: 'large',  label: 'Large',   desc: 'Databases and heavy loads', cores: 8, ram_gb: 16, disk_gb: 200 },
  { id: 'custom', label: 'Custom',  desc: 'Set your own specs',      cores: 2, ram_gb: 4,  disk_gb: 50 },
]

const VLAN_OPTIONS = [
  { id: 10, label: 'VLAN 10 — Management',    desc: 'For platform services, VPN, firewall (192.168.4.x)' },
  { id: 20, label: 'VLAN 20 — Production',    desc: 'For live apps, databases, desktops (10.20.0.x)' },
  { id: 30, label: 'VLAN 30 — Development',   desc: 'For dev/test environments (10.30.0.x)' },
  { id: 40, label: 'VLAN 40 — IoT / Devices', desc: 'For connected hardware (172.16.40.x)' },
  { id: 50, label: 'VLAN 50 — DMZ',           desc: 'For public-facing services (10.50.0.x)' },
]

const STEPS: Step[] = ['os', 'size', 'network', 'review']
const STEP_LABELS: Record<Step, string> = {
  os: 'Choose OS',
  size: 'Pick Size',
  network: 'Network',
  review: 'Review & Create',
}

export function VMCreateWizard({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<Step>('os')
  const [os, setOs] = useState<string | null>(null)
  const [sizePreset, setSizePreset] = useState<string>('small')
  const [cores, setCores] = useState(2)
  const [ramGb, setRamGb] = useState(4)
  const [diskGb, setDiskGb] = useState(40)
  const [vlan, setVlan] = useState(20)
  const [vmName, setVmName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ name: string; vmid: number } | null>(null)

  const stepIndex = STEPS.indexOf(step)
  const canNext = step === 'os' ? !!os : step === 'size' ? true : step === 'network' ? !!vmName.trim() : false

  const handleSizePreset = (presetId: string) => {
    setSizePreset(presetId)
    const preset = SIZE_PRESETS.find((p) => p.id === presetId)
    if (preset && presetId !== 'custom') {
      setCores(preset.cores)
      setRamGb(preset.ram_gb)
      setDiskGb(preset.disk_gb)
    }
  }

  const handleCreate = async () => {
    if (!os || !vmName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const vm = await createVM({
        name: vmName.trim(),
        os_type: os,
        cpu_cores: cores,
        ram_mb: ramGb * 1024,
        disk_gb: diskGb,
        vlan,
      })
      setCreated({ name: vm.name, vmid: vm.vmid })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create VM')
      setCreating(false)
    }
  }

  const selectedOs = OS_OPTIONS.find((o) => o.id === os)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-card w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-nexgen-border/20">
          <h2 className="text-sm font-bold text-nexgen-text flex items-center gap-2">
            <Server size={16} className="text-nexgen-accent" />
            Create Virtual Machine
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-nexgen-card transition-colors text-nexgen-muted">
            <X size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
                i < stepIndex ? 'bg-nexgen-green text-white' :
                i === stepIndex ? 'bg-nexgen-accent text-white' :
                'bg-nexgen-card text-nexgen-muted'
              }`}>
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className={`text-[10px] font-mono ${i === stepIndex ? 'text-nexgen-text' : 'text-nexgen-muted'}`}>
                {STEP_LABELS[s]}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-nexgen-border/30" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="px-6 py-5 min-h-[340px]">
          {/* Success state */}
          {created && (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center">
              <CheckCircle2 size={48} className="text-nexgen-green mb-4" />
              <h3 className="text-base font-bold text-nexgen-text mb-2">VM Created!</h3>
              <p className="text-xs text-nexgen-muted mb-1">
                <span className="font-mono text-nexgen-text">{created.name}</span> (VMID {created.vmid}) is being provisioned.
              </p>
              <p className="text-xs text-nexgen-muted mb-6">
                It will appear in the VM list within a few seconds. Start it when ready.
              </p>
              <div className="flex gap-3">
                <button onClick={onCreated} className="btn-primary text-xs py-2 px-5">Go to VM List</button>
                <button onClick={onClose} className="text-xs px-4 py-2 rounded-lg border border-nexgen-border/40 text-nexgen-muted hover:text-nexgen-text">Close</button>
              </div>
            </div>
          )}

          {/* Step: OS */}
          {!created && step === 'os' && (
            <div className="space-y-3">
              <p className="text-xs text-nexgen-muted mb-4">Choose the operating system for your VM. Don't worry — you can change this later.</p>
              {OS_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setOs(option.id)}
                  className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    os === option.id
                      ? 'border-nexgen-accent/50 bg-nexgen-accent/5 text-nexgen-text'
                      : 'border-nexgen-border/30 text-nexgen-muted hover:border-nexgen-border/60 hover:text-nexgen-text'
                  }`}
                >
                  <span className="text-2xl">{option.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="text-xs text-nexgen-muted mt-0.5">{option.desc}</p>
                  </div>
                  {os === option.id && <CheckCircle2 size={16} className="text-nexgen-accent shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* Step: Size */}
          {!created && step === 'size' && (
            <div className="space-y-4">
              <p className="text-xs text-nexgen-muted mb-4">Choose how much CPU, RAM, and storage this VM gets. You can resize later.</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSizePreset(preset.id)}
                    className={`text-left p-4 rounded-xl border transition-all ${
                      sizePreset === preset.id
                        ? 'border-nexgen-accent/50 bg-nexgen-accent/5 text-nexgen-text'
                        : 'border-nexgen-border/30 text-nexgen-muted hover:border-nexgen-border/60 hover:text-nexgen-text'
                    }`}
                  >
                    <p className="text-sm font-semibold">{preset.label}</p>
                    <p className="text-[10px] text-nexgen-muted mt-0.5 mb-2">{preset.desc}</p>
                    {preset.id !== 'custom' && (
                      <p className="text-[10px] font-mono text-nexgen-accent">
                        {preset.cores} vCPU · {preset.ram_gb} GB RAM · {preset.disk_gb} GB
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Fine-tune sliders */}
              <div className="glass-card p-4 space-y-4 border border-nexgen-border/20">
                <p className="text-xs font-semibold text-nexgen-text">Fine-tune specs</p>
                {[
                  { label: 'CPU Cores', value: cores, min: 1, max: 32, step: 1, unit: 'cores', setter: setCores },
                  { label: 'RAM', value: ramGb, min: 1, max: 64, step: 1, unit: 'GB', setter: setRamGb },
                  { label: 'Disk', value: diskGb, min: 8, max: 500, step: 10, unit: 'GB', setter: setDiskGb },
                ].map(({ label, value, min, max, step: s, unit, setter }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs text-nexgen-muted">{label}</label>
                      <span className="text-xs font-mono text-nexgen-accent">{value} {unit}</span>
                    </div>
                    <input
                      type="range"
                      min={min} max={max} step={s}
                      value={value}
                      onChange={(e) => { setSizePreset('custom'); setter(Number(e.target.value)) }}
                      className="w-full accent-nexgen-accent"
                    />
                    <div className="flex justify-between text-[10px] text-nexgen-muted/60 mt-0.5">
                      <span>{min} {unit}</span><span>{max} {unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Network */}
          {!created && step === 'network' && (
            <div className="space-y-4">
              <p className="text-xs text-nexgen-muted mb-4">Choose a name and network segment for your VM.</p>
              <div>
                <label className="block text-xs text-nexgen-muted mb-1">VM Name *</label>
                <input
                  value={vmName}
                  onChange={(e) => setVmName(e.target.value)}
                  placeholder="e.g. VM-APP-02"
                  className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-sm font-mono text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
                />
                <p className="text-[10px] text-nexgen-muted mt-1">Use a descriptive name that identifies the VM's role.</p>
              </div>

              <div>
                <label className="block text-xs text-nexgen-muted mb-2">Network (VLAN)</label>
                <div className="space-y-2">
                  {VLAN_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVlan(v.id)}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                        vlan === v.id
                          ? 'border-nexgen-accent/50 bg-nexgen-accent/5 text-nexgen-text'
                          : 'border-nexgen-border/30 text-nexgen-muted hover:border-nexgen-border/60 hover:text-nexgen-text'
                      }`}
                    >
                      <CheckCircle2 size={14} className={vlan === v.id ? 'text-nexgen-accent mt-0.5' : 'text-nexgen-muted/30 mt-0.5'} />
                      <div>
                        <p className="text-xs font-semibold">{v.label}</p>
                        <p className="text-[10px] text-nexgen-muted mt-0.5">{v.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Review */}
          {!created && step === 'review' && (
            <div className="space-y-4">
              <p className="text-xs text-nexgen-muted mb-4">Review your VM configuration before creating it.</p>
              <div className="glass-card p-5 space-y-3 border border-nexgen-border/20">
                {[
                  { label: 'Name', value: vmName },
                  { label: 'Operating System', value: selectedOs?.label ?? os },
                  { label: 'CPU', value: `${cores} vCPUs` },
                  { label: 'RAM', value: `${ramGb} GB` },
                  { label: 'Disk', value: `${diskGb} GB` },
                  { label: 'Network', value: VLAN_OPTIONS.find((v) => v.id === vlan)?.label ?? `VLAN ${vlan}` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-nexgen-muted">{label}</span>
                    <span className="text-nexgen-text font-mono">{value}</span>
                  </div>
                ))}
              </div>

              {os === 'win11' && (
                <div className="glass-card p-4 border-l-2 border-nexgen-amber text-xs text-nexgen-muted leading-relaxed">
                  <strong className="text-nexgen-amber">Windows Note:</strong> After creation, you'll need to attach the
                  Windows 11 ISO and VirtIO drivers ISO via the Proxmox console, then boot and install. Remote Desktop
                  must be enabled in Windows Settings after installation.
                </div>
              )}

              {error && (
                <p className="text-xs text-nexgen-red bg-nexgen-red/10 border border-nexgen-red/20 rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        {!created && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-nexgen-border/20 bg-nexgen-surface">
            <button
              onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)])}
              disabled={stepIndex === 0}
              className="flex items-center gap-1 text-xs px-4 py-2 rounded-lg border border-nexgen-border/40 text-nexgen-muted hover:text-nexgen-text transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Back
            </button>

            {step !== 'review' ? (
              <button
                onClick={() => setStep(STEPS[stepIndex + 1])}
                disabled={!canNext}
                className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
              >
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={creating || !vmName.trim()}
                className="btn-primary text-xs py-2 px-5 disabled:opacity-50"
              >
                {creating ? <><Loader2 size={12} className="animate-spin" /> Creating VM...</> : <>Create VM <CheckCircle2 size={14} /></>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
