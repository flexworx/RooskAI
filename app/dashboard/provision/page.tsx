'use client'

import { useState } from 'react'
import {
  Wand2, Shield, Network, Monitor, Code2, ChevronRight,
  CheckCircle2, Loader2, AlertTriangle, ArrowLeft, Wifi, Globe,
} from 'lucide-react'
import { deployService, getDeployments } from '@/services/api'
import { useCallback } from 'react'
import { useApi } from '@/hooks/useApi'
import type { ServiceDeployment } from '@/types'

// ─── Wizard types ───────────────────────────────────────────────────────────

type WizardId = 'vpn' | 'firewall' | 'daas' | 'dev' | 'guacamole' | null

interface WizardCard {
  id: WizardId
  icon: React.ElementType
  color: string
  title: string
  tagline: string
  what: string
  time: string
  difficulty: 'Easy' | 'Guided'
}

const WIZARDS: WizardCard[] = [
  {
    id: 'vpn',
    icon: Wifi,
    color: 'nexgen-blue',
    title: 'WireGuard VPN',
    tagline: 'Secure remote access to your platform',
    what: 'Creates a VPN server that lets you securely connect to your private network from anywhere. Like a private tunnel through the internet.',
    time: '~5 min',
    difficulty: 'Easy',
  },
  {
    id: 'firewall',
    icon: Shield,
    color: 'nexgen-red',
    title: 'OPNsense Firewall',
    tagline: 'Network protection with a browser UI',
    what: 'Sets up a software firewall that controls what traffic enters and leaves your network. Includes a clean web dashboard — no command line needed.',
    time: '~10 min',
    difficulty: 'Guided',
  },
  {
    id: 'daas',
    icon: Monitor,
    color: 'nexgen-amber',
    title: 'Windows Desktop (DaaS)',
    tagline: 'Cloud Windows desktop in your browser',
    what: 'Creates a Windows 11 virtual machine you can access remotely from any browser. Great for running Windows software without a Windows PC.',
    time: '~15 min',
    difficulty: 'Guided',
  },
  {
    id: 'guacamole',
    icon: Globe,
    color: 'nexgen-green',
    title: 'Remote Desktop Gateway',
    tagline: 'Browser-based RDP/VNC/SSH access',
    what: 'Deploys Apache Guacamole — a web portal that lets you connect to any VM via RDP, VNC, or SSH from your browser. No client software needed.',
    time: '~5 min',
    difficulty: 'Easy',
  },
  {
    id: 'dev',
    icon: Code2,
    color: 'nexgen-accent',
    title: 'Developer Environment',
    tagline: 'Ubuntu VM with all dev tools ready',
    what: 'Creates an Ubuntu VM with Docker, Git, Node.js, Python, and VS Code Server pre-installed. Start coding immediately via your browser.',
    time: '~5 min',
    difficulty: 'Easy',
  },
]

// ─── Per-wizard wizard steps ──────────────────────────────────────────────

function VPNWizard({ onDone }: { onDone: (result: ServiceDeployment) => void }) {
  const [step, setStep] = useState(0)
  const [vmName, setVmName] = useState('VM-VPN-01')
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = [
    {
      title: 'What is a VPN?',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted leading-relaxed">
          <p>A <strong className="text-nexgen-text">VPN (Virtual Private Network)</strong> creates a secure, encrypted tunnel between your device and your private server network.</p>
          <div className="glass-card p-4 border border-nexgen-blue/20 space-y-2">
            <p className="text-nexgen-text font-semibold text-xs">What you'll be able to do after this:</p>
            <ul className="space-y-1 text-xs">
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> Connect to your platform from home, a coffee shop, or anywhere</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> Access internal servers by private IP without exposing them to the internet</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> Share access with your team securely</li>
            </ul>
          </div>
          <p className="text-xs">We use <strong className="text-nexgen-text">WireGuard</strong> — the fastest, most modern VPN protocol. It's already trusted by millions of people and companies.</p>
        </div>
      ),
    },
    {
      title: 'Name your VPN server',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-nexgen-muted">Give your VPN server a name. This is just a label to identify it in your VM list.</p>
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">Server Name</label>
            <input
              value={vmName}
              onChange={(e) => setVmName(e.target.value)}
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-sm font-mono text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            />
          </div>
          <div className="glass-card p-4 border border-nexgen-border/20 space-y-2 text-xs text-nexgen-muted">
            <p className="text-nexgen-text font-semibold">What gets created:</p>
            <p>• A small Ubuntu Linux VM (1 vCPU, 1 GB RAM, 10 GB disk)</p>
            <p>• WireGuard VPN software installed automatically</p>
            <p>• Server starts automatically after creation</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Ready to deploy',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted">
          <p>Your WireGuard VPN server will be created with these settings:</p>
          <div className="glass-card p-4 border border-nexgen-blue/20 space-y-2 text-xs font-mono">
            <div className="flex justify-between"><span className="text-nexgen-muted">VM Name</span><span className="text-nexgen-text">{vmName}</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">OS</span><span className="text-nexgen-text">Ubuntu 22.04 LTS</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">Resources</span><span className="text-nexgen-text">1 vCPU · 1 GB RAM · 10 GB</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">Network</span><span className="text-nexgen-text">VLAN 10 (Management)</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">VPN Port</span><span className="text-nexgen-text">51820/UDP</span></div>
          </div>
          <div className="glass-card p-4 border border-nexgen-amber/20 text-xs">
            <p className="text-nexgen-amber font-semibold mb-1">After deployment:</p>
            <p>SSH into your VPN VM and run the WireGuard client config generator. Share the generated QR code or config file with users who need VPN access.</p>
          </div>
          {error && <p className="text-xs text-nexgen-red bg-nexgen-red/10 border border-nexgen-red/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      ),
    },
  ]

  const handleDeploy = async () => {
    setDeploying(true)
    setError(null)
    try {
      const result = await deployService('wireguard-vpn', { name: vmName })
      onDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed')
      setDeploying(false)
    }
  }

  return (
    <WizardShell
      steps={steps}
      step={step}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
      onDeploy={handleDeploy}
      deploying={deploying}
      color="nexgen-blue"
    />
  )
}

function FirewallWizard({ onDone }: { onDone: (result: ServiceDeployment) => void }) {
  const [step, setStep] = useState(0)
  const [vmName, setVmName] = useState('VM-FW-01')
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = [
    {
      title: 'What is a Firewall?',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted leading-relaxed">
          <p>A <strong className="text-nexgen-text">firewall</strong> is a security guard for your network. It checks every connection attempt and only allows the ones you've approved.</p>
          <div className="glass-card p-4 border border-nexgen-red/20 space-y-2">
            <p className="text-nexgen-text font-semibold text-xs">OPNsense gives you:</p>
            <ul className="space-y-1 text-xs">
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> A clean web dashboard to manage all firewall rules</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> Intrusion detection — alerts on suspicious traffic</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> Built-in VPN support (WireGuard & OpenVPN)</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> Traffic logs so you can see what's happening</li>
            </ul>
          </div>
          <p className="text-xs">OPNsense is free, open source, and used by thousands of businesses. It runs entirely on your own hardware — your data never leaves your server.</p>
        </div>
      ),
    },
    {
      title: 'Firewall setup notes',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted">
          <div className="glass-card p-4 border border-nexgen-amber/20 space-y-3 text-xs">
            <p className="text-nexgen-amber font-semibold">Before you deploy — important:</p>
            <p>OPNsense requires manual installation from an ISO image. After the VM is created, you'll need to:</p>
            <ol className="space-y-1 list-decimal list-inside text-nexgen-muted">
              <li>Download the OPNsense ISO from opnsense.org</li>
              <li>Upload it to Proxmox via Datacenter → Storage → ISO Images</li>
              <li>Attach it to this VM via the Proxmox console</li>
              <li>Boot the VM and follow the installer (5-minute process)</li>
            </ol>
          </div>
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">VM Name</label>
            <input
              value={vmName}
              onChange={(e) => setVmName(e.target.value)}
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-sm font-mono text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            />
          </div>
          {error && <p className="text-xs text-nexgen-red bg-nexgen-red/10 border border-nexgen-red/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      ),
    },
    {
      title: 'Ready to create the VM',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted">
          <div className="glass-card p-4 border border-nexgen-red/20 space-y-2 text-xs font-mono">
            <div className="flex justify-between"><span className="text-nexgen-muted">VM Name</span><span className="text-nexgen-text">{vmName}</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">OS</span><span className="text-nexgen-text">FreeBSD (OPNsense)</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">Resources</span><span className="text-nexgen-text">2 vCPU · 2 GB RAM · 16 GB</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">Network</span><span className="text-nexgen-text">VLAN 10 (Management)</span></div>
          </div>
          <div className="glass-card p-4 border border-nexgen-green/20 text-xs space-y-1">
            <p className="text-nexgen-green font-semibold">After install, open your browser to:</p>
            <p className="font-mono text-nexgen-text">https://&lt;vm-ip&gt;</p>
            <p>Login: <span className="font-mono">admin / opnsense</span> (change this immediately!)</p>
          </div>
          {error && <p className="text-xs text-nexgen-red bg-nexgen-red/10 border border-nexgen-red/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      ),
    },
  ]

  const handleDeploy = async () => {
    setDeploying(true)
    setError(null)
    try {
      const result = await deployService('opnsense-firewall', { name: vmName })
      onDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed')
      setDeploying(false)
    }
  }

  return (
    <WizardShell
      steps={steps}
      step={step}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
      onDeploy={handleDeploy}
      deploying={deploying}
      color="nexgen-red"
    />
  )
}

function DaaSWizard({ onDone }: { onDone: (result: ServiceDeployment) => void }) {
  const [step, setStep] = useState(0)
  const [vmName, setVmName] = useState('VM-DESKTOP-01')
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps = [
    {
      title: 'What is Desktop as a Service?',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted leading-relaxed">
          <p><strong className="text-nexgen-text">DaaS (Desktop as a Service)</strong> means running a full Windows PC in the cloud. You access it from any browser or device — it lives on your server, not your physical PC.</p>
          <div className="glass-card p-4 border border-nexgen-amber/20 space-y-2">
            <p className="text-nexgen-text font-semibold text-xs">Great for:</p>
            <ul className="space-y-1 text-xs">
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> Running Windows-only software from a Mac or Linux device</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> Giving remote workers a company desktop without shipping hardware</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={14} className="text-nexgen-green mt-0.5 shrink-0" /> Keeping sensitive work data off personal devices</li>
            </ul>
          </div>
          <div className="glass-card p-4 border border-nexgen-amber/20 text-xs">
            <p className="text-nexgen-amber font-semibold mb-1">Licensing requirement:</p>
            <p>Windows 11 requires a <strong className="text-nexgen-text">Pro or Enterprise license</strong> for Remote Desktop. Home editions do not support multi-user RDP.</p>
          </div>
        </div>
      ),
    },
    {
      title: 'What you\'ll need',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted">
          <p>Creating a Windows desktop VM is a guided process. Here's what you'll need ready:</p>
          <div className="space-y-3">
            {[
              { icon: '💿', label: 'Windows 11 ISO', desc: 'Download from Microsoft\'s official website. You\'ll upload it to Proxmox storage.' },
              { icon: '🔧', label: 'VirtIO Drivers ISO', desc: 'Download virtio-win from Fedora\'s GitHub. Needed for best performance inside Proxmox.' },
              { icon: '🔑', label: 'Windows License Key', desc: 'A valid Windows 11 Pro or Enterprise license.' },
              { icon: '🌐', label: 'Apache Guacamole', desc: 'Deploy the Remote Desktop Gateway (on the previous screen) to access your desktop from a browser.' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 glass-card p-3 border border-nexgen-border/20">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="text-xs font-semibold text-nexgen-text">{item.label}</p>
                  <p className="text-[10px] text-nexgen-muted mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Configure your desktop',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted">
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">VM Name</label>
            <input
              value={vmName}
              onChange={(e) => setVmName(e.target.value)}
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-sm font-mono text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            />
          </div>
          <div className="glass-card p-4 border border-nexgen-amber/20 space-y-2 text-xs font-mono">
            <div className="flex justify-between"><span className="text-nexgen-muted">VM Name</span><span className="text-nexgen-text">{vmName}</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">OS</span><span className="text-nexgen-text">Windows 11 (ISO required)</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">Resources</span><span className="text-nexgen-text">4 vCPU · 8 GB RAM · 80 GB</span></div>
            <div className="flex justify-between"><span className="text-nexgen-muted">Network</span><span className="text-nexgen-text">VLAN 20 (Production)</span></div>
          </div>
          <div className="glass-card p-4 border border-nexgen-blue/20 text-xs space-y-1">
            <p className="text-nexgen-blue font-semibold">After VM creation:</p>
            <ol className="list-decimal list-inside space-y-1 text-nexgen-muted">
              <li>Attach both ISOs via Proxmox console</li>
              <li>Boot and complete Windows installation</li>
              <li>Enable Remote Desktop in Windows Settings</li>
              <li>Add an RDP connection in Guacamole Admin</li>
            </ol>
          </div>
          {error && <p className="text-xs text-nexgen-red bg-nexgen-red/10 border border-nexgen-red/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      ),
    },
  ]

  const handleDeploy = async () => {
    setDeploying(true)
    setError(null)
    try {
      const result = await deployService('windows-desktop', { name: vmName })
      onDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed')
      setDeploying(false)
    }
  }

  return (
    <WizardShell
      steps={steps}
      step={step}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
      onDeploy={handleDeploy}
      deploying={deploying}
      color="nexgen-amber"
    />
  )
}

function SimpleDeployWizard({
  templateId,
  defaultName,
  color,
  what,
  specs,
  postDeploy,
  onDone,
}: {
  templateId: string
  defaultName: string
  color: string
  what: string
  specs: Record<string, string>
  postDeploy: string[]
  onDone: (result: ServiceDeployment) => void
}) {
  const [vmName, setVmName] = useState(defaultName)
  const [deploying, setDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: 'What you\'re deploying',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted leading-relaxed">
          <p>{what}</p>
          <div className="glass-card p-4 border border-nexgen-border/20 space-y-2 text-xs font-mono">
            {Object.entries(specs).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-nexgen-muted">{k}</span>
                <span className="text-nexgen-text">{v}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: 'Name and deploy',
      content: (
        <div className="space-y-4 text-sm text-nexgen-muted">
          <div>
            <label className="block text-xs text-nexgen-muted mb-1">VM Name</label>
            <input
              value={vmName}
              onChange={(e) => setVmName(e.target.value)}
              className="w-full bg-nexgen-bg border border-nexgen-border/40 rounded-lg px-3 py-2 text-sm font-mono text-nexgen-text focus:outline-none focus:border-nexgen-accent/60"
            />
          </div>
          {postDeploy.length > 0 && (
            <div className="glass-card p-4 border border-nexgen-blue/20 text-xs space-y-1">
              <p className="text-nexgen-blue font-semibold mb-1">After deployment:</p>
              {postDeploy.map((note, i) => <p key={i}>• {note}</p>)}
            </div>
          )}
          {error && <p className="text-xs text-nexgen-red bg-nexgen-red/10 border border-nexgen-red/20 rounded-lg px-3 py-2">{error}</p>}
        </div>
      ),
    },
  ]

  const handleDeploy = async () => {
    setDeploying(true)
    setError(null)
    try {
      const result = await deployService(templateId, { name: vmName })
      onDone(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed')
      setDeploying(false)
    }
  }

  return (
    <WizardShell
      steps={steps}
      step={step}
      onBack={() => setStep((s) => Math.max(0, s - 1))}
      onNext={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
      onDeploy={handleDeploy}
      deploying={deploying}
      color={color}
    />
  )
}

// ─── Shared wizard shell ────────────────────────────────────────────────────

function WizardShell({
  steps,
  step,
  onBack,
  onNext,
  onDeploy,
  deploying,
  color,
}: {
  steps: { title: string; content: React.ReactNode }[]
  step: number
  onBack: () => void
  onNext: () => void
  onDeploy: () => void
  deploying: boolean
  color: string
}) {
  const isLast = step === steps.length - 1

  return (
    <div className="space-y-6">
      {/* Progress dots */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-colors ${
              i < step ? `bg-nexgen-green text-white` :
              i === step ? `bg-${color} text-white` :
              'bg-nexgen-card text-nexgen-muted'
            }`}>
              {i < step ? '✓' : i + 1}
            </div>
            <span className={`text-[10px] font-mono ${i === step ? 'text-nexgen-text' : 'text-nexgen-muted'} hidden sm:inline`}>
              {s.title}
            </span>
            {i < steps.length - 1 && <div className="w-6 h-px bg-nexgen-border/30" />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="glass-card p-6 min-h-[300px]">
        <h3 className="text-sm font-bold text-nexgen-text mb-4">{steps[step].title}</h3>
        {steps[step].content}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={onBack}
          disabled={step === 0}
          className="flex items-center gap-1 text-xs px-4 py-2 rounded-lg border border-nexgen-border/40 text-nexgen-muted hover:text-nexgen-text transition-colors disabled:opacity-30"
        >
          <ChevronRight size={14} className="rotate-180" /> Back
        </button>
        {isLast ? (
          <button
            onClick={onDeploy}
            disabled={deploying}
            className="btn-primary text-xs py-2 px-6 disabled:opacity-50"
          >
            {deploying ? <><Loader2 size={12} className="animate-spin" /> Deploying...</> : <>Deploy Now <CheckCircle2 size={14} /></>}
          </button>
        ) : (
          <button onClick={onNext} className="btn-primary text-xs py-2 px-5">
            Next <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Success screen ─────────────────────────────────────────────────────────

function SuccessScreen({ result, onReset }: { result: ServiceDeployment; onReset: () => void }) {
  return (
    <div className="glass-card p-8 text-center space-y-4">
      <CheckCircle2 size={48} className="text-nexgen-green mx-auto" />
      <h3 className="text-base font-bold text-nexgen-text">Deployment Started!</h3>
      <p className="text-sm text-nexgen-muted">
        <span className="font-mono text-nexgen-text">{result.vm_name}</span> (VMID {result.vmid}) is being provisioned.
      </p>
      <div className="glass-card p-4 border border-nexgen-green/20 text-xs font-mono text-left space-y-1 max-w-sm mx-auto">
        <div className="flex justify-between"><span className="text-nexgen-muted">Template</span><span className="text-nexgen-text">{result.template_name}</span></div>
        <div className="flex justify-between"><span className="text-nexgen-muted">Status</span><span className="text-nexgen-green">{result.status}</span></div>
        <div className="flex justify-between"><span className="text-nexgen-muted">Deployment ID</span><span className="text-nexgen-text">{result.deployment_id}</span></div>
      </div>
      <div className="flex gap-3 justify-center pt-2">
        <a href="/dashboard/vms" className="btn-primary text-xs py-2 px-5">View VM List</a>
        <button onClick={onReset} className="text-xs px-4 py-2 rounded-lg border border-nexgen-border/40 text-nexgen-muted hover:text-nexgen-text">
          Deploy Another
        </button>
      </div>
    </div>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function ProvisionPage() {
  const [selected, setSelected] = useState<WizardId>(null)
  const [result, setResult] = useState<ServiceDeployment | null>(null)

  const deploymentsF = useCallback(() => getDeployments(), [])
  const { data: deployments } = useApi<ServiceDeployment[]>(deploymentsF, 10000)
  const recentDeploys = Array.isArray(deployments) ? deployments.slice(0, 3) : []

  const handleDone = (r: ServiceDeployment) => {
    setResult(r)
    setSelected(null)
  }

  const selectedCard = WIZARDS.find((w) => w.id === selected)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {selected && (
          <button
            onClick={() => { setSelected(null); setResult(null) }}
            className="p-2 rounded-lg hover:bg-nexgen-card transition-colors text-nexgen-muted hover:text-nexgen-text"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-nexgen-text flex items-center gap-2">
            <Wand2 size={22} className="text-nexgen-accent" />
            {selected ? `Deploy: ${selectedCard?.title}` : 'Provision Infrastructure'}
          </h1>
          {!selected && (
            <p className="text-xs text-nexgen-muted mt-0.5">
              Step-by-step wizards for VMs, VPNs, firewalls, and desktops — no technical knowledge required.
            </p>
          )}
        </div>
      </div>

      {/* Success result */}
      {result && !selected && (
        <SuccessScreen result={result} onReset={() => setResult(null)} />
      )}

      {/* Wizard picker */}
      {!selected && !result && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {WIZARDS.map((w) => {
              const Icon = w.icon
              return (
                <button
                  key={w.id}
                  onClick={() => setSelected(w.id)}
                  className="glass-card-hover p-5 text-left group"
                >
                  <div className="flex items-start gap-4 mb-3">
                    <div className={`w-12 h-12 rounded-xl bg-${w.color}/10 flex items-center justify-center shrink-0 group-hover:bg-${w.color}/20 transition-colors`}>
                      <Icon size={24} className={`text-${w.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-nexgen-text">{w.title}</h3>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                          w.difficulty === 'Easy'
                            ? 'bg-nexgen-green/10 text-nexgen-green'
                            : 'bg-nexgen-amber/10 text-nexgen-amber'
                        }`}>
                          {w.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-nexgen-muted mt-0.5">{w.tagline}</p>
                    </div>
                  </div>
                  <p className="text-xs text-nexgen-muted leading-relaxed mb-3">{w.what}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-nexgen-muted font-mono">Est. {w.time}</span>
                    <span className={`flex items-center gap-1 text-xs text-${w.color} group-hover:gap-2 transition-all`}>
                      Start <ChevronRight size={14} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Recent deployments */}
          {recentDeploys.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-xs font-semibold text-nexgen-text mb-3">Recent Deployments</h3>
              <div className="space-y-2">
                {recentDeploys.map((dep) => (
                  <div key={dep.deployment_id} className="flex items-center justify-between text-xs">
                    <span className="font-mono text-nexgen-text">{dep.vm_name}</span>
                    <span className="text-nexgen-muted">{dep.template_name}</span>
                    <span className={`font-mono ${dep.status === 'deployed' || dep.status === 'running' ? 'text-nexgen-green' : dep.status === 'awaiting_iso' ? 'text-nexgen-amber' : 'text-nexgen-muted'}`}>
                      {dep.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Active wizard */}
      {selected === 'vpn' && <VPNWizard onDone={handleDone} />}
      {selected === 'firewall' && <FirewallWizard onDone={handleDone} />}
      {selected === 'daas' && <DaaSWizard onDone={handleDone} />}
      {selected === 'guacamole' && (
        <SimpleDeployWizard
          templateId="guacamole"
          defaultName="VM-GUAC-01"
          color="nexgen-green"
          what="Apache Guacamole is a browser-based remote desktop gateway. Once deployed, you can access any VM via RDP, VNC, or SSH from your browser without installing any software."
          specs={{ OS: 'Ubuntu 22.04 LTS', Resources: '2 vCPU · 4 GB RAM · 20 GB', Network: 'VLAN 20 (Production)', 'Web UI': 'http://<vm-ip>:8080/guacamole', 'Default Login': 'guacadmin / guacadmin' }}
          postDeploy={['Open Guacamole at http://<vm-ip>:8080/guacamole', 'Login with guacadmin / guacadmin', 'Change the password immediately in Settings', 'Add RDP connections for your Windows VMs']}
          onDone={handleDone}
        />
      )}
      {selected === 'dev' && (
        <SimpleDeployWizard
          templateId="dev-environment"
          defaultName="VM-DEV-01"
          color="nexgen-accent"
          what="A ready-to-code Ubuntu VM with Docker, Git, Node.js 20, Python 3.11, and build tools pre-installed. Access your VS Code browser IDE immediately after deployment."
          specs={{ OS: 'Ubuntu 22.04 LTS', Resources: '4 vCPU · 8 GB RAM · 50 GB', Network: 'VLAN 20 (Production)', 'Pre-installed': 'Docker, Git, Node 20, Python 3.11, VS Code Server' }}
          postDeploy={['SSH in with: ssh deploy@<vm-ip>', 'All tools are ready — no setup required', 'Use VS Code Server at http://<vm-ip>:8080 for browser-based coding']}
          onDone={handleDone}
        />
      )}
    </div>
  )
}
