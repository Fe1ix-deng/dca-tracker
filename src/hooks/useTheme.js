import { useCallback, useEffect, useState } from 'react'

const THEME_STORAGE_KEY = 'dca-tracker:theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'
const VALID_THEMES = new Set(['light', 'dark'])
export const ACCENT_STORAGE_KEY = 'dca-tracker:accent'
export const VALID_ACCENTS = new Set(['indigo', 'amber', 'green', 'mono'])

function canUseBrowserStorage() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

function getSystemTheme() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'dark'
  }

  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

function getStoredTheme() {
  if (!canUseBrowserStorage()) {
    return null
  }

  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY)
    return VALID_THEMES.has(value) ? value : null
  } catch {
    return null
  }
}

function saveTheme(theme) {
  if (!canUseBrowserStorage()) {
    return
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Theme persistence is a convenience; rendering should continue if storage is unavailable.
  }
}

function resolveThemeState() {
  const userPreference = getStoredTheme()

  return {
    theme: userPreference || getSystemTheme(),
    userPreference,
  }
}

export function getStoredAccent() {
  if (!canUseBrowserStorage()) {
    return null
  }

  try {
    const value = window.localStorage.getItem(ACCENT_STORAGE_KEY)
    return VALID_ACCENTS.has(value) ? value : null
  } catch {
    return null
  }
}

export function resolveAccentState() {
  const userPreference = getStoredAccent()

  return {
    accent: userPreference || 'indigo',
    userPreference,
  }
}

function saveAccent(accent) {
  if (!canUseBrowserStorage()) {
    return
  }

  try {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent)
  } catch {
    // Accent persistence is a convenience; rendering should continue if storage is unavailable.
  }
}

export default function useTheme() {
  const [themeState, setThemeState] = useState(resolveThemeState)
  const [accentState, setAccentState] = useState(resolveAccentState)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.dataset.theme = themeState.theme
    document.documentElement.style.colorScheme = themeState.theme
  }, [themeState.theme])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    document.documentElement.dataset.accent = accentState.accent
  }, [accentState.accent])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(DARK_QUERY)
    const handleSystemChange = (event) => {
      setThemeState((current) => {
        if (current.userPreference) {
          return current
        }

        return {
          theme: event.matches ? 'dark' : 'light',
          userPreference: null,
        }
      })
    }

    mediaQuery.addEventListener?.('change', handleSystemChange)
    mediaQuery.addListener?.(handleSystemChange)

    return () => {
      mediaQuery.removeEventListener?.('change', handleSystemChange)
      mediaQuery.removeListener?.(handleSystemChange)
    }
  }, [])

  const setTheme = useCallback((nextTheme) => {
    if (!VALID_THEMES.has(nextTheme)) {
      return
    }

    saveTheme(nextTheme)
    setThemeState({
      theme: nextTheme,
      userPreference: nextTheme,
    })
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      const nextTheme = current.theme === 'dark' ? 'light' : 'dark'
      saveTheme(nextTheme)

      return {
        theme: nextTheme,
        userPreference: nextTheme,
      }
    })
  }, [])

  const setAccent = useCallback((nextAccent) => {
    if (!VALID_ACCENTS.has(nextAccent)) {
      return
    }

    saveAccent(nextAccent)
    setAccentState({
      accent: nextAccent,
      userPreference: nextAccent,
    })
  }, [])

  return {
    theme: themeState.theme,
    isUserPreference: Boolean(themeState.userPreference),
    accent: accentState.accent,
    setAccent,
    setTheme,
    toggleTheme,
  }
}
