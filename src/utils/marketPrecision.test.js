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

  it('keeps formatted prices safe for controlled inputs at four digits', () => {
    expect(formatPrice(1000.12, 'US')).toBe('1000.12')
    expect(formatPrice(1000.123, 'CN')).toBe('1000.123')
    expect(normalizePriceInput(formatPrice(1000.123, 'CN'), 'CN')).toBe('1000.123')
    expect(formatPrice('', 'CN')).toBe('')
  })

  it('rounds numeric strings and returns zero for invalid prices without throwing', () => {
    expect(roundPrice('1000.1234', 'CN')).toBe(1000.123)
    expect(roundPrice(Number.NaN, 'CN')).toBe(0)
    expect(roundPrice(Number.POSITIVE_INFINITY, 'US')).toBe(0)
    expect(roundPrice(Symbol('invalid-price'), 'US')).toBe(0)
  })
})
