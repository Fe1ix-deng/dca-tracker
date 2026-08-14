import { describe, expect, it } from 'vitest'
import { getDeployableBudget, getRemainingDeployableBudget, getBudgetLimitedShares } from './budget'

describe('budget helpers', () => {
  it('uses deployable budget after reserve cash for fixed plans', () => {
    const plan = {
      budgetMode: 'fixed',
      totalBudget: 10000,
      reserveRatio: 0.2,
    }

    expect(getDeployableBudget(plan)).toBe(8000)
    expect(getRemainingDeployableBudget(plan, 1250)).toBe(6750)
  })

  it('returns zero remaining budget for open-ended plans', () => {
    expect(getRemainingDeployableBudget({ budgetMode: 'open-ended', totalBudget: 10000 }, 1250)).toBe(0)
  })

  it('caps whole-share suggestions at the remaining fixed-plan budget', () => {
    expect(getBudgetLimitedShares(5, 93, { budgetMode: 'fixed', totalBudget: 5500, reserveRatio: 0, totalPeriods: 12 }, 5045)).toBe(4)
    expect(getBudgetLimitedShares(5, 93, { budgetMode: 'fixed', totalBudget: 5500, reserveRatio: 0, totalPeriods: 12 }, 5500)).toBe(0)
    expect(getBudgetLimitedShares(1, 70, { budgetMode: 'fixed', totalBudget: 100, reserveRatio: 0 }, 70)).toBe(0)
  })
})
