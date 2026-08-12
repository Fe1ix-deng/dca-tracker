import { describe, expect, it } from 'vitest'
import { rebuildPlanState } from './App'

describe('rebuildPlanState', () => {
  const plan = {
    id: 'plan-1',
    name: 'Test plan',
    strategy: 'DCA',
    budgetMode: 'fixed',
    totalBudget: 10000,
    reserveRatio: 0.2,
    totalPeriods: 4,
    currentPeriod: 2,
    frequency: 'monthly',
    targetAnnualReturn: 0.2,
    assets: [
      {
        ticker: 'QLD',
        name: 'QLD',
        weight: 1,
        currentShares: 13,
        initialAverageCost: 80,
      },
    ],
  }

  const firstRecord = {
    id: 'record-1',
    planId: 'plan-1',
    periodIndex: 0,
    date: '2026-01-01T00:00:00.000Z',
    assets: [
      {
        ticker: 'QLD',
        price: 100,
        actualShares: 2,
        actualAmount: 200,
      },
    ],
    totalActualAmount: 200,
  }

  const secondRecord = {
    id: 'record-2',
    planId: 'plan-1',
    periodIndex: 1,
    date: '2026-02-01T00:00:00.000Z',
    assets: [
      {
        ticker: 'QLD',
        price: 100,
        actualShares: 1,
        actualAmount: 100,
      },
    ],
    totalActualAmount: 100,
  }

  it('preserves initial holdings when rebuilding after record deletion', () => {
    const { nextPlan, nextRecords } = rebuildPlanState(plan, [firstRecord], [firstRecord, secondRecord])

    expect(nextPlan.assets[0].initialShares).toBe(10)
    expect(nextPlan.assets[0].initialAverageCost).toBe(80)
    expect(nextPlan.assets[0].currentShares).toBe(12)
    expect(nextPlan.currentPeriod).toBe(1)
    expect(nextRecords[0].remainingBudget).toBe(7800)
  })

  it('recalculates remaining budget when fixed plan budget settings change', () => {
    const updatedPlan = {
      ...plan,
      totalBudget: 20000,
      reserveRatio: 0.2,
    }

    const staleRecord = {
      ...firstRecord,
      cumulativeInvested: 200,
      remainingBudget: 7800,
    }

    const { nextRecords } = rebuildPlanState(updatedPlan, [staleRecord])

    expect(nextRecords[0].remainingBudget).toBe(15800)
  })

  it('rebuilds state when one zero-share asset is removed from a record', () => {
    const multiAssetPlan = {
      ...plan,
      currentPeriod: 1,
      assets: [
        {
          ticker: 'QLD',
          name: 'QLD',
          weight: 0.5,
          currentShares: 12,
        },
        {
          ticker: 'IBIT',
          name: 'IBIT',
          weight: 0.5,
          currentShares: 5,
        },
      ],
    }

    const editedRecord = {
      ...firstRecord,
      assets: [
        {
          ticker: 'QLD',
          price: 100,
          actualShares: 2,
          actualAmount: 200,
        },
      ],
    }

    const { nextPlan, nextRecords } = rebuildPlanState(multiAssetPlan, [editedRecord], [editedRecord])

    expect(nextPlan.currentPeriod).toBe(1)
    expect(nextPlan.assets.find((asset) => asset.ticker === 'QLD').currentShares).toBe(12)
    expect(nextPlan.assets.find((asset) => asset.ticker === 'IBIT').currentShares).toBe(5)
    expect(nextRecords[0].assets).toHaveLength(1)
    expect(nextRecords[0].totalActualAmount).toBe(200)
  })

  it('rebuilds historical shares and prices into the current split basis', () => {
    const splitPlan = {
      ...plan,
      createdAt: '2026-01-01T00:00:00.000Z',
      currentPeriod: 1,
      assets: [{
        ...plan.assets[0],
        currentShares: 12,
        initialShares: 10,
        initialAverageCost: 80,
      }],
      splitEvents: [{
        id: 'split-1',
        ticker: 'QLD',
        effectiveDate: '2026-06-01',
        newShares: 2,
        oldShares: 1,
      }],
    }
    const preSplitRecord = {
      ...firstRecord,
      date: '2026-05-01T00:00:00.000Z',
      assets: [{ ...firstRecord.assets[0], price: 100, actualShares: 2, actualAmount: 200 }],
    }

    const { nextPlan, nextRecords } = rebuildPlanState(splitPlan, [preSplitRecord])
    const adjustedAsset = nextRecords[0].assets[0]

    expect(adjustedAsset.price).toBe(100)
    expect(adjustedAsset.actualShares).toBe(2)
    expect(adjustedAsset.adjustedPrice).toBe(50)
    expect(adjustedAsset.adjustedShares).toBe(4)
    expect(nextPlan.assets[0].initialShares).toBe(20)
    expect(nextPlan.assets[0].initialAverageCost).toBe(40)
    expect(nextPlan.assets[0].currentShares).toBe(24)
  })

  it('does not apply an event on or before a post-split record date', () => {
    const splitPlan = {
      ...plan,
      createdAt: '2026-01-01T00:00:00.000Z',
      assets: [{ ...plan.assets[0], currentShares: 12, initialShares: 10 }],
      splitEvents: [{
        id: 'split-1',
        ticker: 'QLD',
        effectiveDate: '2026-06-01',
        newShares: 2,
        oldShares: 1,
      }],
    }
    const postSplitRecord = {
      ...firstRecord,
      date: '2026-06-01T00:00:00.000Z',
      assets: [{ ...firstRecord.assets[0], price: 50, actualShares: 4, actualAmount: 200 }],
    }

    const { nextRecords } = rebuildPlanState(splitPlan, [postSplitRecord])

    expect(nextRecords[0].assets[0].adjustedShares).toBe(4)
    expect(nextRecords[0].assets[0].adjustedPrice).toBe(50)
  })

  it('is idempotent when rebuilding already adjusted records', () => {
    const splitPlan = {
      ...plan,
      createdAt: '2026-01-01T00:00:00.000Z',
      assets: [{ ...plan.assets[0], currentShares: 24, initialShares: 10 }],
      splitEvents: [{
        id: 'split-1',
        ticker: 'QLD',
        effectiveDate: '2026-06-01',
        newShares: 2,
        oldShares: 1,
      }],
    }
    const rawRecord = { ...firstRecord, date: '2026-05-01T00:00:00.000Z' }
    const firstBuild = rebuildPlanState(splitPlan, [rawRecord])
    const secondBuild = rebuildPlanState(firstBuild.nextPlan, firstBuild.nextRecords)

    expect(secondBuild.nextRecords[0].assets[0].adjustedShares).toBe(firstBuild.nextRecords[0].assets[0].adjustedShares)
    expect(secondBuild.nextPlan.assets[0].currentShares).toBe(firstBuild.nextPlan.assets[0].currentShares)
  })
})
