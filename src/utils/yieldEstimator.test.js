import { describe, expect, it } from 'vitest'
import { estimateTargetYield } from './yieldEstimator'

describe('estimateTargetYield', () => {
  it('returns a neutral fallback when there are no assets or zero total weight', () => {
    expect(estimateTargetYield([])).toEqual({
      estimatedYield: 0.15,
      minYield: 0.1,
      maxYield: 0.2,
      breakdown: [],
    })
    expect(estimateTargetYield([{ ticker: 'VOO', weight: 0 }])).toEqual({
      estimatedYield: 0.15,
      minYield: 0.1,
      maxYield: 0.2,
      breakdown: [],
    })
  })

  it('rounds a single known ticker down to the nearest 5% step', () => {
    // VOO's reference yield is 0.14, which rounds down to 0.10.
    const result = estimateTargetYield([{ ticker: 'voo', weight: 1 }])
    expect(result.estimatedYield).toBe(0.1)
    expect(result.minYield).toBe(0.05)
    expect(result.maxYield).toBe(0.15)
    expect(result.breakdown).toEqual([{ ticker: 'VOO', weight: 1, referenceYield: 0.14 }])
  })

  it('falls back to the default 15% reference yield for unlisted tickers', () => {
    // Regression test: a floating point rounding error used to make this
    // silently come out as 0.10 instead of 0.15 (0.15 / 0.05 evaluates to
    // 2.9999999999999996 in JS, which floored to the wrong bucket).
    const result = estimateTargetYield([{ ticker: 'UNKNOWNTICKER', weight: 1 }])
    expect(result.estimatedYield).toBe(0.15)
    expect(result.breakdown[0].referenceYield).toBe(0.15)
  })

  it('weights the blended yield by each asset\u2019s allocation', () => {
    // TQQQ 0.38 and SPY 0.14 at equal weight -> average 0.26 -> rounds down to 0.25
    const result = estimateTargetYield([
      { ticker: 'TQQQ', weight: 0.5 },
      { ticker: 'SPY', weight: 0.5 },
    ])
    expect(result.estimatedYield).toBe(0.25)
  })
})
