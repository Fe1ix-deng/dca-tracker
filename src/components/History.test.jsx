import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getAdjustedAssetDisplay, createHistoryEditDraft, formatHistoryPrice } from './History'

describe('History helpers', () => {
  it('uses adjusted values for display only when a split factor exists', () => {
    expect(getAdjustedAssetDisplay({ actualShares: 2, price: 100, splitFactor: 2, adjustedShares: 4, adjustedPrice: 50 })).toEqual({
      hasAdjustment: true,
      shares: 4,
      price: 50,
    })
    expect(getAdjustedAssetDisplay({ actualShares: 2, price: 100 })).toEqual({
      hasAdjustment: false,
      shares: 2,
      price: 100,
    })
  })

  it('offers backup import before a plan exists', () => {
    const source = readFileSync(new URL('./History.jsx', import.meta.url), 'utf8')
    const emptyStateBranch = source.match(/if \(!plan\) \{([\s\S]*?)\n  \}\n\n  return/)?.[1] ?? ''

    expect(emptyStateBranch).toContain('<BackupImportButton')
  })

  it('preserves three decimal places in a CN history price draft', () => {
    const draft = createHistoryEditDraft({
      market: 'CN',
      assets: [{ ticker: '600519', price: 12.345, actualShares: 1 }],
    })

    expect(draft.assets[0].price).toBe('12.345')
  })

  it('formats visible history prices by market precision', () => {
    expect(formatHistoryPrice(12.345, { market: 'CN' })).toBe('12.345')
    expect(formatHistoryPrice(100, { market: 'US' })).toBe('100')
    expect(formatHistoryPrice(100, { market: 'US' })).not.toContain('100.000')
  })
})
