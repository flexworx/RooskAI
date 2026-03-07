'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X } from 'lucide-react'

const shortcuts = [
  { keys: ['Ctrl', 'K'], description: 'Open command palette' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modal / palette' },
  { keys: ['G', 'D'], description: 'Go to Dashboard' },
  { keys: ['G', 'V'], description: 'Go to VMs' },
  { keys: ['G', 'S'], description: 'Go to Security' },
  { keys: ['G', 'M'], description: 'Go to Monitoring' },
  { keys: ['G', 'T'], description: 'Go to Terminal' },
]

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key === '?' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[92]"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-md z-[93]"
          >
            <div className="bg-nexgen-surface border border-nexgen-border/40 rounded-xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-nexgen-border/20">
                <div className="flex items-center gap-2">
                  <Keyboard size={16} className="text-nexgen-accent" />
                  <span className="text-sm font-semibold text-nexgen-text">Keyboard Shortcuts</span>
                </div>
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-nexgen-card transition-colors">
                  <X size={14} className="text-nexgen-muted" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {shortcuts.map((s) => (
                  <div key={s.description} className="flex items-center justify-between py-2 px-2 rounded hover:bg-nexgen-card/30">
                    <span className="text-xs text-nexgen-text">{s.description}</span>
                    <div className="flex gap-1">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded border border-nexgen-border/30 bg-nexgen-card text-[10px] font-mono text-nexgen-muted min-w-[24px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-nexgen-border/20">
                <p className="text-[10px] text-nexgen-muted text-center">
                  Press <kbd className="font-mono">?</kbd> to toggle this panel
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
