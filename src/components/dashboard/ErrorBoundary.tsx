'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="glass-card p-4 border border-nexgen-red/30 bg-nexgen-red/5 m-2">
          <p className="text-xs text-nexgen-red font-mono">
            Component error: {this.state.error?.message ?? 'Unknown'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 text-[10px] text-nexgen-accent hover:underline"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
