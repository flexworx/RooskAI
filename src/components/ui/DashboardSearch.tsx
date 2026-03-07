'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'

interface DashboardSearchProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
}

export function DashboardSearch({ placeholder = 'Search...', value, onChange }: DashboardSearchProps) {
  const [focused, setFocused] = useState(false)

  return (
    <div className={`relative w-64 transition-all ${focused ? 'w-72' : ''}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-nexgen-muted" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full pl-8 pr-8 py-2 bg-nexgen-bg border border-nexgen-border/40 rounded-lg text-xs text-nexgen-text placeholder:text-nexgen-muted/50 focus:outline-none focus:border-nexgen-accent/60 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-nexgen-card"
        >
          <X size={12} className="text-nexgen-muted" />
        </button>
      )}
    </div>
  )
}
