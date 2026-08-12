import { describe, expect, it } from 'vitest'
import {
  adjustAssetForSplit,
  getSplitFactor,
  getSplitFactorBetween,
  normalizeSplitEvents,
  parseSplitRatio,
} from './stockSplits'

describe('stock split helpers', () => {
  it('parses forward and reverse ratios as new shares over old shares', () => {
    expect(parseSplitRatio('2:1')).toEqual({ newShares: 2, oldShares: 1 })
    expect(parseSplitRatio('1:2')).toEqual({ newShares: 1, oldShares: 2 })
    expect(parseSplitRatio('0:1')).toBeNull()
    expect(parseSplitRatio('2/1')).toBeNull()
    expect(normalizeSplitEvents([{ ticker: 'QLD', effectiveDate: '2026-02-30', newShares: 2, oldShares: 1 }])).toEqual([])
  })

  it('normalizes valid events and discards malformed events', () => {
    expect(normalizeSplitEvents([
      { id: 'bad', ticker: 'QLD', effectiveDate: 'not-a-date', newShares: 2, oldShares: 1 },
      { id: 'second', ticker: 'QLD', effectiveDate: '2026-06-01', newShares: 1, oldShares: 2 },
      { id: 'first', ticker: 'qld', effectiveDate: '2026-01-01', newShares: 2, oldShares: 1 },
    ])).toEqual([
      { id: 'first', ticker: 'QLD', effectiveDate: '2026-01-01', newShares: 2, oldShares: 1 },
      { id: 'second', ticker: 'QLD', effectiveDate: '2026-06-01', newShares: 1, oldShares: 2 },
    ])
  })

  it('applies events after a source date and through an as-of date', () => {
    const events = normalizeSplitEvents([
      { id: 'split-1', ticker: 'QLD', effectiveDate: '2026-06-01', newShares: 2, oldShares: 1 },
      { id: 'split-2', ticker: 'QLD', effectiveDate: '2026-07-01', newShares: 1, oldShares: 2 },
    ])

    expect(getSplitFactor('QLD', '2026-01-01', events, '2026-08-01')).toBe(1)
    expect(getSplitFactor('QLD', '2026-01-01', events, '2026-06-30')).toBe(2)
    expect(getSplitFactor('QLD', '2026-06-01', events, '2026-08-01')).toBe(0.5)
    expect(getSplitFactorBetween('QLD', '2026-01-01', '2026-06-01', events)).toBe(2)
  })

  it('preserves raw fields while deriving fractional adjusted shares and price', () => {
    const asset = { ticker: 'QLD', price: 100, actualShares: 0.5, actualAmount: 50 }
    expect(adjustAssetForSplit(asset, 2)).toEqual({
      ...asset,
      adjustedShares: 1,
      adjustedPrice: 50,
      splitFactor: 2,
    })
  })
})
