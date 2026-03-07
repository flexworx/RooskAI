'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface Notification {
  id: string
  type: 'alert' | 'info' | 'success' | 'warning'
  title: string
  message?: string
  timestamp: string
  read: boolean
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const connect = useCallback((token: string | null) => {
    if (!token || typeof window === 'undefined') return

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${protocol}//${window.location.host}/api/notifications/ws?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'notification') {
          setNotifications((prev) => [
            { ...data.payload, id: data.payload.id || crypto.randomUUID(), read: false },
            ...prev,
          ].slice(0, 50)) // Keep last 50
        }
        if (data.type === 'alert_count') {
          // Initial count sync handled via REST
        }
      } catch {
        // ignore non-JSON messages
      }
    }

    ws.onclose = () => {
      setConnected(false)
      // Reconnect after 5s
      setTimeout(() => connect(token), 5000)
    }

    ws.onerror = () => ws.close()

    return () => {
      ws.close()
    }
  }, [])

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close()
    }
  }, [])

  return { notifications, unreadCount, connected, connect, markRead, markAllRead, dismiss }
}
