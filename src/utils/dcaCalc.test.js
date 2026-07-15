import { describe, expect, it } from 'vitest'
import { calculateDcaProjection, getPeriodicAmount, getSuggestedShares } from './dcaCalc'

describe('getPeriodicAmount', () => {
  const fixedPlan = {
    budgetMode: 'fixed',
    totalBudget: 50000,
    reserveRatio: 0.2,
    totalPeriods: 12,
  }

  it('splits the deployable budget evenly across periods, weighted by asset', () => {
    // deployable = 50000 * (1 - 0.2) = 40000; /12 periods = 3333.33; * 0.5 weight
    expect(getPeriodicAmount(fixedPlan, 0.5)).toBe(1666.67)
  })

  it('uses the flat periodic target for open-ended plans, ignoring totalPeriods', () => {
    const openEndedPlan = { budgetMode: 'open-ended', periodicTarget: 1000 }
    expect(getPeriodicAmount(openEndedPlan, 0.5)).toBe(500)
  })

  it('falls back to safe defaults for missing or invalid fields', () => {
    expect(getPeriodicAmount({}, 0.5)).toBe(0)
    expect(getPeriodicAmount(fixedPlan, undefined)).toBe(0)
  })

  it('does not divide by zero when totalPeriods is 0 or missing', () => {
    const planWithoutPeriods = { budgetMode: 'fixed', totalBudget: 1000, reserveRatio: 0 }
    expect(getPeriodicAmount(planWithoutPeriods, 1)).toBe(1000)
  })
})

describe('getSuggestedShares', () => {
  it('rounds to the nearest whole share', () => {
    expect(getSuggestedShares(1666.67, 500)).toBe(3)
    expect(getSuggestedShares(1666.67, 700)).toBe(2)
  })

  it('returns 0 when price is zero, negative, or missing', () => {
    expect(getSuggestedShares(1000, 0)).toBe(0)
    expect(getSuggestedShares(1000, -10)).toBe(0)
    expect(getSuggestedShares(1000, undefined)).toBe(0)
  })
})

describe('calculateDcaProjection', () => {
  it('returns both the share count and the rounded cost for the period', () => {
    expect(calculateDcaProjection({ amount: 1666.666, price: 500 })).toEqual({
      shares: 3,
      estimatedCost: 1666.67,
    })
  })
})
