import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { rebuildPlanState, stateNeedsRebuild } from './App'

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

  it('detects stale derived state and becomes stable after rebuilding', () => {
    const stalePlan = {
      ...plan,
      currentPeriod: 1,
      assets: [{ ...plan.assets[0], currentShares: 12, initialShares: 10 }],
    }
    const { nextPlan, nextRecords } = rebuildPlanState(stalePlan, [firstRecord])

    expect(stateNeedsRebuild(stalePlan, [firstRecord])).toBe(true)
    expect(stateNeedsRebuild(nextPlan, nextRecords)).toBe(false)
  })

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

  it('preserves CN price precision for rebuilt recommendations and legacy US rounding', () => {
    const cnPlan = {
      ...plan,
      market: 'CN',
      budgetMode: 'open-ended',
      periodicTarget: 18.52,
      currentPeriod: 1,
      assets: [{ ...plan.assets[0], currentShares: 0, weight: 1 }],
    }
    const cnRecord = {
      ...firstRecord,
      assets: [{ ...firstRecord.assets[0], price: 12.345, actualShares: 3 }],
    }

    const { nextRecords: cnRecords } = rebuildPlanState(cnPlan, [cnRecord])
    const cnAsset = cnRecords[0].assets[0]

    expect(cnAsset.price).toBe(12.345)
    expect(cnAsset.suggestedShares).toBe(2)
    expect(cnAsset.actualAmount).toBe(37.04)

    const { market: _market, ...legacyPlan } = cnPlan
    const { nextRecords: legacyRecords } = rebuildPlanState(legacyPlan, [cnRecord])

    expect(legacyRecords[0].assets[0].price).toBe(12.35)

    const cnSplitPlan = {
      ...cnPlan,
      createdAt: '2026-01-01T00:00:00.000Z',
      splitEvents: [{
        id: 'split-cn',
        ticker: 'QLD',
        effectiveDate: '2026-02-01',
        newShares: 2,
        oldShares: 1,
      }],
    }
    const { nextRecords: cnSplitRecords } = rebuildPlanState(cnSplitPlan, [{
      ...cnRecord,
      date: '2026-01-01T00:00:00.000Z',
    }])

    expect(cnSplitRecords[0].assets[0].adjustedPrice).toBe(6.173)
  })

  it('stores VA history with tracked and total pre-buy values', () => {
    const vaPlan = {
      ...plan,
      strategy: 'VA',
      totalBudget: 5500,
      reserveRatio: 0,
      totalPeriods: 12,
      initialShares: 251.14,
      assets: [{
        ...plan.assets[0],
        currentShares: 257.14,
        initialShares: 251.14,
      }],
    }
    const record = {
      ...firstRecord,
      assets: [{ ...firstRecord.assets[0], price: 81.8, actualShares: 6, actualAmount: 490.8 }],
    }

    const { nextRecords } = rebuildPlanState(vaPlan, [record])

    expect(nextRecords[0].assets[0].currentValueBefore).toBe(0)
    expect(nextRecords[0].assets[0].totalCurrentValueBefore).toBeCloseTo(20543.25, 2)
    expect(nextRecords[0].assets[0].requiredAmount).toBe(458.33)
    expect(nextRecords[0].assets[0].suggestedShares).toBe(6)
  })

  it('keeps user-entered baseline holdings and cost separate from accumulated shares', () => {
    const vaPlan = {
      ...plan,
      strategy: 'VA',
      assets: [{
        ...plan.assets[0],
        currentShares: 257.14,
        initialShares: 251.14,
        initialSharesOriginal: 251.14,
        initialAverageCost: 77.62,
        initialAverageCostOriginal: 77.62,
      }],
    }
    const record = {
      ...firstRecord,
      assets: [{ ...firstRecord.assets[0], actualShares: 6, actualAmount: 490.8 }],
    }

    const { nextPlan } = rebuildPlanState(vaPlan, [record])
    const asset = nextPlan.assets[0]

    expect(asset.initialSharesOriginal).toBe(251.14)
    expect(asset.initialAverageCostOriginal).toBe(77.62)
    expect(asset.currentShares).toBe(257.14)
  })

  it('shares the fixed-plan budget cap across multiple historical assets', () => {
    const multiAssetPlan = {
      ...plan,
      strategy: 'DCA',
      totalBudget: 100,
      reserveRatio: 0,
      totalPeriods: 1,
      assets: [
        { ticker: 'QLD', weight: 0.5, currentShares: 0 },
        { ticker: 'IBIT', weight: 0.5, currentShares: 0 },
      ],
    }
    const record = {
      ...firstRecord,
      assets: [
        { ticker: 'QLD', price: 70, actualShares: 0, actualAmount: 0 },
        { ticker: 'IBIT', price: 70, actualShares: 0, actualAmount: 0 },
      ],
    }

    const { nextRecords } = rebuildPlanState(multiAssetPlan, [record])

    expect(nextRecords[0].assets.map((asset) => asset.suggestedShares)).toEqual([1, 0])
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

  it('keeps split-adjusted initial holdings out of the historical VA tracked value', () => {
    const splitPlan = {
      ...plan,
      strategy: 'VA',
      createdAt: '2026-01-01T00:00:00.000Z',
      currentPeriod: 2,
      assets: [{ ...plan.assets[0], currentShares: 24, initialShares: 10 }],
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
      periodIndex: 0,
      date: '2026-05-01T00:00:00.000Z',
      assets: [{ ...firstRecord.assets[0], price: 100, actualShares: 2, actualAmount: 200 }],
    }
    const postSplitRecord = {
      ...secondRecord,
      periodIndex: 1,
      date: '2026-06-15T00:00:00.000Z',
      assets: [{ ...secondRecord.assets[0], price: 50, actualShares: 2, actualAmount: 100 }],
    }

    const { nextRecords } = rebuildPlanState(splitPlan, [postSplitRecord, preSplitRecord])

    expect(nextRecords.find((record) => record.periodIndex === 1).assets[0].currentValueBefore).toBe(200)
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

describe('backup import wiring', () => {
  it('replaces the entire imported plan list instead of appending plans one at a time', () => {
    const source = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
    const importHandler = source.match(/const handleImportBackup = \(payload\) => \{([\s\S]*?)\n  \}\n\n  const handleClearAllData/)?.[1] ?? ''

    expect(importHandler).toContain('replacePlans(nextPlans, nextActivePlanId)')
    expect(importHandler).not.toContain('nextPlans.forEach')
  })
})
