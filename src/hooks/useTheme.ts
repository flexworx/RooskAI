'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  toggle: () => void
}

const THEME_KEY = 'nexgen_theme'

export function useThemeProvider(): ThemeState {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark'
    return (localStorage.getItem(THEME_KEY) as Theme) || 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
      root.classList.remove('light')
    } else {
      root.classList.add('light')
      root.classList.remove('dark')
    }
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggle }
}

export const ThemeContext = createContext<ThemeState>({
  theme: 'dark',
  toggle: () => {},
})

export const useTheme = () => useContext(ThemeContext)
