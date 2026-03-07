'use client'

import { useState, useCallback, createContext, useContext } from 'react'

interface User {
  email: string
  name: string
  role: 'platform_admin' | 'operator' | 'viewer'
  mfa_enabled?: boolean
}

interface LoginResult {
  success: boolean
  mfa_required?: boolean
  mfa_token?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string, totpCode?: string) => Promise<LoginResult>
  mfaLogin: (mfaToken: string, totpCode: string) => Promise<boolean>
  logout: () => void
}

const AUTH_KEY = 'nexgen_token'
const USER_KEY = 'nexgen_user'

export function useAuthProvider(): AuthState {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(USER_KEY)
    return stored ? JSON.parse(stored) : null
  })
  const [token, setToken] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : localStorage.getItem(AUTH_KEY),
  )

  const isAuthenticated = !!token && !!user

  const login = useCallback(async (email: string, password: string, totpCode?: string): Promise<LoginResult> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totp_code: totpCode || null }),
    })

    if (res.ok) {
      const data = await res.json()

      if (data.mfa_required) {
        return { success: false, mfa_required: true, mfa_token: data.mfa_token }
      }

      setToken(data.access_token)
      setUser(data.user)
      localStorage.setItem(AUTH_KEY, data.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return { success: true }
    }

    return { success: false }
  }, [])

  const mfaLogin = useCallback(async (mfaToken: string, totpCode: string): Promise<boolean> => {
    const res = await fetch('/api/auth/mfa/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mfa_token: mfaToken, totp_code: totpCode }),
    })

    if (res.ok) {
      const data = await res.json()
      setToken(data.access_token)
      setUser(data.user)
      localStorage.setItem(AUTH_KEY, data.access_token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      return true
    }

    return false
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(AUTH_KEY)
    localStorage.removeItem(USER_KEY)
  }, [])

  return { user, token, isAuthenticated, login, mfaLogin, logout }
}

export const AuthContext = createContext<AuthState>({
  user: null,
  token: null,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  mfaLogin: async () => false,
  logout: () => {},
})

export const useAuth = () => useContext(AuthContext)
