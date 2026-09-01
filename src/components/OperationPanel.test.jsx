import { describe, expect, it } from 'vitest'
import { formatOperationPrice, getActualSharesForDecision, normalizeOperationPrice } from './OperationPanel'

describe('OperationPanel helpers', () => {
  it('uses suggested shares when the user has not manually edited actual shares', () => {
    expect(getActualSharesForDecision({
      tag: 'normal',
      hasManualActualShares: false,
      actualSharesInput: null,
      suggestedShares: 3,
    })).toBe(3)
  })

  it('uses zero shares for paused records even when a suggestion exists', () => {
    expect(getActualSharesForDecision({
      tag: 'paused',
      hasManualActualShares: false,
      actualSharesInput: null,
      suggestedShares: 3,
    })).toBe(0)
  })

  it('normalizes a CN operation price to three decimals', () => {
    expect(normalizeOperationPrice('12.34567', { market: 'CN' })).toBe('12.345')
  })

  it('formats visible operation prices by market precision', () => {
    expect(formatOperationPrice(12.345, { market: 'CN' })).toBe('12.345')
    expect(formatOperationPrice(100, { market: 'US' })).toBe('100')
    expect(formatOperationPrice(100, { market: 'US' })).not.toContain('100.000')
  })
})
