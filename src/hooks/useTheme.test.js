import { beforeEach, describe, expect, it } from 'vitest'
import { getStoredAccent, resolveAccentState } from './useTheme'

const storage = new Map()
globalThis.window = {
  localStorage: {
    clear: () => storage.clear(),
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
  },
}

describe('accent preference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to indigo when no preference exists', () => {
    expect(getStoredAccent()).toBeNull()
    expect(resolveAccentState()).toEqual({ accent: 'indigo', userPreference: null })
  })

  it('restores a valid persisted accent', () => {
    window.localStorage.setItem('dca-tracker:accent', 'amber')
    expect(resolveAccentState()).toEqual({ accent: 'amber', userPreference: 'amber' })
  })

  it('rejects unknown persisted accents', () => {
    window.localStorage.setItem('dca-tracker:accent', 'electric-purple')
    expect(resolveAccentState()).toEqual({ accent: 'indigo', userPreference: null })
  })
})
