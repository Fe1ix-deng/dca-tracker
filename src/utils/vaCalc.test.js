import { describe, expect, it } from 'vitest'
import {
  calcAllTargets,
  getInitialTargetValue,
  getTargetValue,
  getRequiredInvestment,
  getTrackedShares,
  getPeriodicGrowthRate,
} from './vaCalc'

describe('vaCalc', () => {
  const monthlyPlan = {
    strategy: 'VA',
    budgetMode: 'fixed',
    totalBudget: 50000,
    reserveRatio: 0.2,
    totalPeriods: 12,
    frequency: 'monthly',
    targetAnnualReturn: 0.2,
    assets: [
      { ticker: 'QLD', weight: 0.5 },
      { ticker: 'IBIT', weight: 0.5 },
    ],
  }

  it('uses DCA-sized target for the first VA period', () => {
    expect(getInitialTargetValue(0.5, monthlyPlan)).toBe(1666.67)
    expect(getTargetValue(0, 0.5, monthlyPlan)).toBe(1666.67)
  })

  it('starts VA growth from the second period', () => {
    expect(getTargetValue(1, 0.5, monthlyPlan)).toBe(3358.86)
  })

  it('computes required investment from current value gap', () => {
    expect(getRequiredInvestment(3000, getTargetValue(1, 0.5, monthlyPlan))).toBe(358.86)
  })

  it('tracks only shares added after the plan started', () => {
    expect(getTrackedShares(257.14, 251.14)).toBe(6)
    expect(getTrackedShares(251.14, 251.14)).toBe(0)
  })

  it('uses equivalent periodic compounding for the configured annual return', () => {
    expect(getPeriodicGrowthRate(monthlyPlan)).toBeCloseTo(Math.pow(1.2, 1 / 12) - 1, 10)
    expect(getPeriodicGrowthRate({ ...monthlyPlan, frequency: 'biweekly' })).toBeCloseTo(Math.pow(1.2, 1 / 26) - 1, 10)
  })

  describe('calcAllTargets', () => {
    it('sizes the matrix to totalPeriods for a fixed-budget plan', () => {
      const matrix = calcAllTargets(monthlyPlan)
      expect(matrix).toHaveLength(12)
    })

    it('sizes an open-ended plan matrix to currentPeriod + 1, not a huge fixed placeholder', () => {
      // Regression test: this used to always compute 9999 rows (with an
      // O(n^2) inner loop) for every open-ended plan, freezing the UI for
      // ~230ms+ even on a brand new plan. It should only ever compute the
      // rows that are actually reachable.
      const openEndedPlan = {
        ...monthlyPlan,
        budgetMode: 'open-ended',
        periodicTarget: 1000,
        currentPeriod: 3,
      }

      const matrix = calcAllTargets(openEndedPlan)
      expect(matrix).toHaveLength(4)
      expect(matrix[3]).toEqual([
        getTargetValue(3, 0.5, openEndedPlan),
        getTargetValue(3, 0.5, openEndedPlan),
      ])
    })

    it('still returns a usable row for a brand new open-ended plan (currentPeriod 0)', () => {
      const openEndedPlan = {
        ...monthlyPlan,
        budgetMode: 'open-ended',
        periodicTarget: 1000,
        currentPeriod: 0,
      }

      const matrix = calcAllTargets(openEndedPlan)
      expect(matrix).toHaveLength(1)
    })
  })
})
