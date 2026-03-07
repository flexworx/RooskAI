'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, LayoutDashboard, Server, Database, Network, Shield,
  Bot, Activity, FileCheck, Settings, Users, Terminal, Boxes,
  Home, Cpu, Phone, ArrowRight, Brain,
} from 'lucide-react'
import { clsx } from 'clsx'

interface Command {
  id: string
  label: string
  href: string
  icon: React.ComponentType<Record<string, unknown>>
  group: string
}

const commands: Command[] = [
  // Dashboard
  { id: 'dash', label: 'Dashboard Overview', href: '/dashboard', icon: LayoutDashboard, group: 'Dashboard' },
  { id: 'vms', label: 'Virtual Machines', href: '/dashboard/vms', icon: Server, group: 'Dashboard' },
  { id: 'services', label: 'Services', href: '/dashboard/services', icon: Boxes, group: 'Dashboard' },
  { id: 'dbs', label: 'Databases', href: '/dashboard/databases', icon: Database, group: 'Dashboard' },
  { id: 'networks', label: 'Networks', href: '/dashboard/networks', icon: Network, group: 'Dashboard' },
  { id: 'security', label: 'Security Center', href: '/dashboard/security', icon: Shield, group: 'Dashboard' },
  { id: 'agents', label: 'AI Agents', href: '/dashboard/ai-agents', icon: Bot, group: 'Dashboard' },
  { id: 'monitoring', label: 'Monitoring', href: '/dashboard/monitoring', icon: Activity, group: 'Dashboard' },
  { id: 'compliance', label: 'Compliance', href: '/dashboard/compliance', icon: FileCheck, group: 'Dashboard' },
  { id: 'users', label: 'User Management', href: '/dashboard/users', icon: Users, group: 'Dashboard' },
  { id: 'terminal', label: 'SSH Terminal', href: '/dashboard/terminal', icon: Terminal, group: 'Dashboard' },
  { id: 'cos', label: 'Chief of Staff AI', href: '/dashboard/chief-of-staff', icon: Brain, group: 'Dashboard' },
  { id: 'settings', label: 'Settings', href: '/dashboard/settings', icon: Settings, group: 'Dashboard' },
  // Public
  { id: 'home', label: 'Home', href: '/', icon: Home, group: 'Pages' },
  { id: 'platform', label: 'Platform', href: '/platform', icon: Cpu, group: 'Pages' },
  { id: 'contact', label: 'Contact / Request Demo', href: '/contact', icon: Phone, group: 'Pages' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const filtered = query
    ? commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands

  const groups = Array.from(new Set(filtered.map((c) => c.group)))

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const navigate = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      navigate(filtered[selectedIndex].href)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[91]"
          >
            <div className="bg-nexgen-surface border border-nexgen-border/40 rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-nexgen-border/20">
                <Search size={16} className="text-nexgen-muted flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search pages and commands..."
                  className="flex-1 bg-transparent py-3.5 text-sm text-nexgen-text placeholder:text-nexgen-muted/50 focus:outline-none"
                />
                <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded border border-nexgen-border/30 text-[10px] text-nexgen-muted font-mono">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-2">
                {filtered.length === 0 && (
                  <p className="text-xs text-nexgen-muted text-center py-6">No results found</p>
                )}
                {groups.map((group) => (
                  <div key={group}>
                    <p className="text-[10px] text-nexgen-muted uppercase tracking-wider px-4 py-1.5">
                      {group}
                    </p>
                    {filtered
                      .filter((c) => c.group === group)
                      .map((cmd) => {
                        const globalIdx = filtered.indexOf(cmd)
                        const isSelected = globalIdx === selectedIndex
                        return (
                          <button
                            key={cmd.id}
                            onClick={() => navigate(cmd.href)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={clsx(
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                              isSelected
                                ? 'bg-nexgen-accent/10 text-nexgen-accent'
                                : 'text-nexgen-text hover:bg-nexgen-card/50',
                            )}
                          >
                            <cmd.icon size={16} className={isSelected ? 'text-nexgen-accent' : 'text-nexgen-muted'} />
                            <span className="text-sm flex-1">{cmd.label}</span>
                            {isSelected && <ArrowRight size={12} className="text-nexgen-accent" />}
                          </button>
                        )
                      })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="border-t border-nexgen-border/20 px-4 py-2 flex items-center gap-4 text-[10px] text-nexgen-muted">
                <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono">↵</kbd> select</span>
                <span><kbd className="font-mono">esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
