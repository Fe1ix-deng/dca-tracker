import { describe, expect, it } from 'vitest'
import { getAdjustedAssetDisplay } from './History'

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
})
