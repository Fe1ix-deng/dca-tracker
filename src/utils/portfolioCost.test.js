import { describe, expect, it } from 'vitest'
import { calculateAverageCost, calculatePriceGapPct } from './portfolioCost'

describe('portfolio cost helpers', () => {
  it('calculates full-position average cost with initial holdings and recorded buys', () => {
    const asset = {
      ticker: 'QLD',
      currentShares: 42,
      initialShares: 40,
      initialAverageCost: 80,
    }
    const records = [
      {
        assets: [
          {
            ticker: 'QLD',
            actualShares: 2,
            actualAmount: 200,
          },
        ],
      },
    ]

    const result = calculateAverageCost(asset, records)

    expect(result.hasKnownCost).toBe(true)
    expect(result.averageCost).toBeCloseTo(80.95, 2)
  })

  it('does not fake a low average cost when initial shares have no known cost', () => {
    const asset = {
      ticker: 'QLD',
      currentShares: 42,
      initialShares: 40,
      initialAverageCost: 0,
    }
    const records = [
      {
        assets: [
          {
            ticker: 'QLD',
            actualShares: 2,
            actualAmount: 200,
          },
        ],
      },
    ]

    const result = calculateAverageCost(asset, records)

    expect(result.hasKnownCost).toBe(false)
    expect(result.averageCost).toBeNull()
  })

  it('calculates average cost from recorded buys when there are no initial shares', () => {
    const asset = {
      ticker: 'QLD',
      currentShares: 2,
      initialShares: 0,
      initialAverageCost: 0,
    }
    const records = [
      {
        assets: [
          {
            ticker: 'QLD',
            actualShares: 2,
            actualAmount: 200,
          },
        ],
      },
    ]

    const result = calculateAverageCost(asset, records)

    expect(result.hasKnownCost).toBe(true)
    expect(result.averageCost).toBe(100)
  })

  it('returns null price gap when average cost is unknown', () => {
    expect(calculatePriceGapPct(100, null)).toBeNull()
  })

  it('uses split-adjusted recorded shares and cost when available', () => {
    const result = calculateAverageCost({
      ticker: 'QLD',
      currentShares: 24,
      initialShares: 20,
      initialAverageCost: 40,
    }, [{
      assets: [{
        ticker: 'QLD',
        actualShares: 2,
        actualAmount: 200,
        adjustedShares: 4,
        adjustedActualAmount: 200,
      }],
    }])

    expect(result.recordedShares).toBe(4)
    expect(result.recordedCost).toBe(200)
    expect(result.averageCost).toBeCloseTo(41.67, 2)
  })
})
