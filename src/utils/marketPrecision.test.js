import { describe, expect, it } from 'vitest'
import {
  formatPrice,
  getPriceDecimals,
  normalizeMarket,
  normalizePriceInput,
  roundPrice,
} from './marketPrecision'

describe('market price precision', () => {
  it('defaults missing and invalid markets to US', () => {
    expect(normalizeMarket()).toBe('US')
    expect(normalizeMarket('CN')).toBe('CN')
    expect(normalizeMarket('unknown')).toBe('US')
    expect(getPriceDecimals({ market: 'CN' })).toBe(3)
  })

  it('keeps US prices at two decimals and does not force zeros', () => {
    expect(roundPrice(100.126, 'US')).toBe(100.13)
    expect(formatPrice(100, 'US')).toBe('100')
    expect(normalizePriceInput('12.345', 'US')).toBe('12.34')
  })

  it('supports three decimals for A-share prices without forced zeros', () => {
    expect(roundPrice(12.3456, 'CN')).toBe(12.346)
    expect(formatPrice(12.345, 'CN')).toBe('12.345')
    expect(formatPrice(100, 'CN')).toBe('100')
    expect(normalizePriceInput('12.3456', 'CN')).toBe('12.345')
  })
})
