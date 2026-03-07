'use client'

import { useState } from 'react'
import { Download, FileText, Table } from 'lucide-react'
import { clsx } from 'clsx'

interface ExportButtonProps {
  data: Record<string, unknown>[]
  filename: string
  columns?: { key: string; label: string }[]
}

function toCSV(data: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  if (data.length === 0) return ''
  const cols = columns || Object.keys(data[0]).map((k) => ({ key: k, label: k }))
  const header = cols.map((c) => `"${c.label}"`).join(',')
  const rows = data.map((row) =>
    cols.map((c) => {
      const val = row[c.key]
      return `"${String(val ?? '').replace(/"/g, '""')}"`
    }).join(','),
  )
  return [header, ...rows].join('\n')
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const exportCSV = () => {
    const csv = toCSV(data, columns)
    downloadFile(csv, `${filename}.csv`, 'text/csv')
    setMenuOpen(false)
  }

  const exportJSON = () => {
    downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json')
    setMenuOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-nexgen-muted hover:text-nexgen-text hover:bg-nexgen-card transition-colors"
      >
        <Download size={14} />
        Export
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-40 bg-nexgen-surface border border-nexgen-border/40 rounded-lg shadow-xl z-50 py-1">
            <button
              onClick={exportCSV}
              className={clsx('w-full flex items-center gap-2 px-3 py-2 text-xs text-nexgen-text hover:bg-nexgen-card/50 transition-colors')}
            >
              <Table size={12} className="text-nexgen-muted" />
              Export CSV
            </button>
            <button
              onClick={exportJSON}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-nexgen-text hover:bg-nexgen-card/50 transition-colors"
            >
              <FileText size={12} className="text-nexgen-muted" />
              Export JSON
            </button>
          </div>
        </>
      )}
    </div>
  )
}
