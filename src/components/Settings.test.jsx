import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getSavedReserveRatio } from './Settings'

describe('Settings helpers', () => {
  it('does not force narrow settings layouts to a 320px minimum width', () => {
    const stylesheet = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    const bodyRule = stylesheet.match(/body\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

    expect(bodyRule).not.toMatch(/min-width\s*:\s*320px/)
  })

  it('preserves an explicit zero reserve ratio when saving fixed plans', () => {
    expect(getSavedReserveRatio(false, 0)).toBe(0)
  })

  it('falls back to default reserve ratio only when missing', () => {
    expect(getSavedReserveRatio(false, undefined)).toBe(0.2)
  })

  it('always saves zero reserve ratio for open-ended plans', () => {
    expect(getSavedReserveRatio(true, 0.2)).toBe(0)
  })
})
