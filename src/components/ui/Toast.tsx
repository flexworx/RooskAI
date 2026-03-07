'use client'

import { createContext, useContext, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react'
import { clsx } from 'clsx'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContext {
  toast: (type: ToastType, title: string, message?: string) => void
}

const ToastContext = createContext<ToastContext>({
  toast: () => {},
})

export const useToast = () => useContext(ToastContext)

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'border-nexgen-green/30 bg-nexgen-green/5',
  error: 'border-nexgen-red/30 bg-nexgen-red/5',
  warning: 'border-nexgen-amber/30 bg-nexgen-amber/5',
  info: 'border-nexgen-accent/30 bg-nexgen-accent/5',
}

const iconColors = {
  success: 'text-nexgen-green',
  error: 'text-nexgen-red',
  warning: 'text-nexgen-amber',
  info: 'text-nexgen-accent',
}

let counter = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = `toast-${++counter}`
    setToasts((prev) => [...prev, { id, type, title, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.type]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={clsx(
                  'flex items-start gap-3 px-4 py-3 rounded-lg border backdrop-blur-lg shadow-lg',
                  styles[t.type],
                )}
              >
                <Icon size={16} className={clsx('mt-0.5 flex-shrink-0', iconColors[t.type])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-nexgen-text">{t.title}</p>
                  {t.message && (
                    <p className="text-xs text-nexgen-muted mt-0.5">{t.message}</p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="p-0.5 rounded hover:bg-nexgen-card transition-colors flex-shrink-0"
                >
                  <X size={12} className="text-nexgen-muted" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
