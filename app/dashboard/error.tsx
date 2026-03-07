'use client'

import { AlertTriangle, RotateCcw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass-card p-10 max-w-md text-center">
        <AlertTriangle size={40} className="text-nexgen-red mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-nexgen-text mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-nexgen-muted mb-6 font-mono">
          {error.message || 'An unexpected error occurred in the dashboard.'}
        </p>
        <button onClick={reset} className="btn-primary text-sm px-6 py-2.5">
          <RotateCcw size={14} />
          Try Again
        </button>
        {error.digest && (
          <p className="text-[10px] text-nexgen-muted mt-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
