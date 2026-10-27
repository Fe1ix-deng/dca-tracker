import { describe, expect, it } from 'vitest'
import { formatMoney, formatSignedMoney } from './money'

describe('money formatting', () => {
  it('formats US amounts as USD', () => {
    expect(formatMoney(1234.56, 'US')).toBe('$1,235')
    expect(formatSignedMoney(-12.4, 'US')).toBe('-$12')
  })
  it('formats CN amounts as CNY', () => {
    expect(formatMoney(1234.56, 'CN')).toBe('CN¥1,235')
    expect(formatSignedMoney(12.4, { market: 'CN' })).toBe('+CN¥12')
  })
})
