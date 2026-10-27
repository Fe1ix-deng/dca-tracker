import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { rebuildPlanState, stateNeedsRebuild } from './App'
import { calculatePortfolioCostBasis } from './utils/portfolioCost'

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

  it('preserves raw transaction prices and amounts while rounding derived recommendations', () => {
    const cnPlan = {
      ...plan,
      market: 'CN',
      budgetMode: 'open-ended',
      periodicTarget: 18.52,
      currentPeriod: 1,
      assets: [{ ...plan.assets[0], currentShares: 0, initialSharesOriginal: 0, weight: 1 }],
    }
    const cnRecord = {
      ...firstRecord,
      assets: [{ ...firstRecord.assets[0], price: 12.345, actualShares: 3 }],
    }

    const { nextRecords: cnRecords } = rebuildPlanState(cnPlan, [cnRecord])
    const cnAsset = cnRecords[0].assets[0]

    expect(cnAsset.price).toBe(12.345)
    expect(cnAsset.suggestedShares).toBe(1.5)
    expect(cnAsset.actualAmount).toBe(200)

    const { market: _market, ...legacyPlan } = cnPlan
    const { nextRecords: legacyRecords } = rebuildPlanState(legacyPlan, [cnRecord])

    expect(legacyRecords[0].assets[0].price).toBe(12.345)

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

  it('preserves CN initial cost precision through split-adjusted rebuilds', () => {
    const cnPlan = {
      ...plan,
      market: 'CN',
      createdAt: '2026-01-01T00:00:00.000Z',
      currentPeriod: 0,
      assets: [{
        ...plan.assets[0],
        currentShares: 1,
        initialShares: 1,
        initialSharesOriginal: 1,
        initialAverageCost: 12.345,
        initialAverageCostOriginal: 12.345,
      }],
      splitEvents: [{
        id: 'split-cn-cost',
        ticker: 'QLD',
        effectiveDate: '2026-02-01',
        newShares: 2,
        oldShares: 1,
      }],
    }

    const { nextPlan, nextRecords } = rebuildPlanState(cnPlan, [])

    expect(nextPlan.assets[0].initialAverageCostOriginal).toBe(12.345)
    expect(nextPlan.assets[0].initialAverageCost).toBe(6.173)

    const cnRecord = {
      ...firstRecord,
      date: '2026-01-15T00:00:00.000Z',
      assets: [{ ...firstRecord.assets[0], price: 12.345, actualShares: 0.113 }],
    }
    const rebuilt = rebuildPlanState(cnPlan, [cnRecord])
    const adjustedAsset = rebuilt.nextRecords[0].assets[0]

    expect(adjustedAsset.adjustedPrice).toBe(6.173)
    expect(adjustedAsset.adjustedActualAmount).toBe(200)
    expect(calculatePortfolioCostBasis(rebuilt.nextPlan.assets, rebuilt.nextRecords)).toEqual({
      costBasis: 212.35,
      hasKnownCost: true,
    })
    expect(nextRecords).toEqual([])
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
    expect(nextRecords[0].assets[0].suggestedShares).toBe(5.6)
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

    expect(nextRecords[0].assets.map((asset) => asset.suggestedShares)).toEqual([0.71, 0.71])
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

describe('single-plan deletion wiring', () => {
  it('removes a plan, its records, and returns to Settings', () => {
    const source = readFileSync(new URL('./App.jsx', import.meta.url), 'utf8')
    const deleteHandler = source.match(/const handleDeletePlan = \(planId\) => \{([\s\S]*?)\n  \}\n\n  const handleImportBackup/)?.[1] ?? ''

    expect(deleteHandler).toContain('records.filter((record) => record.planId !== planId)')
    expect(deleteHandler).toContain('removePlan(planId)')
    expect(deleteHandler).toContain('markDataChanged()')
    expect(deleteHandler).toContain("navigateTo('settings')")
    expect(source).toContain('onDeletePlan={handleDeletePlan}')
  })
})

it('uses an explicit valuation day, is idempotent and preserves raw transactions during split rebuild',()=>{
 const plan={id:'p',strategy:'DCA',budgetMode:'fixed',totalBudget:10000,totalPeriods:12,reserveRatio:0,assets:[{ticker:'QLD',weight:1}]};const firstRecord={id:'r',planId:'p',periodIndex:0};const p={...plan,createdAt:'2026-01-01T00:00:00Z',assets:[{...plan.assets[0],initialSharesOriginal:0,initialShares:0,currentShares:10}],splitEvents:[{id:'s',ticker:'QLD',effectiveDate:'2026-02-01',newShares:1,oldShares:4},{id:'future',ticker:'QLD',effectiveDate:'2026-04-01',newShares:2,oldShares:1}]};const r={...firstRecord,date:'2026-01-10',assets:[{ticker:'QLD',price:120,actualShares:10,actualAmount:1199.99}],totalActualAmount:1199.99};const options={asOfDate:'2026-03-01'};const a=rebuildPlanState(p,[r],[r],options),b=rebuildPlanState(a.nextPlan,a.nextRecords,a.nextRecords,options);expect(a.nextPlan.assets[0].currentShares).toBe(2.5);expect(a.nextRecords[0].assets[0]).toMatchObject({price:120,actualShares:10,actualAmount:1199.99,adjustedPrice:480});expect(a.nextRecords[0].totalActualAmount).toBe(1199.99);expect(b).toEqual(a)
})

it('does not infer extra initial shares by rounding fractional raw record shares',()=>{
 const plan={id:'fractional',strategy:'DCA',budgetMode:'fixed',totalBudget:10000,totalPeriods:12,reserveRatio:0,createdAt:'2026-01-01',assets:[{ticker:'SPY',weight:1,currentShares:.12345678}]}
 const record={id:'fractional-r',planId:plan.id,periodIndex:0,date:'2026-01-02',assets:[{ticker:'SPY',price:120,actualShares:.12345678,actualAmount:14.81}],totalActualAmount:14.81}
 const options={asOfDate:'2026-03-01'},first=rebuildPlanState(plan,[record],[record],options)
 expect(first.nextPlan.assets[0]).toMatchObject({initialSharesOriginal:0,currentShares:.12345678})
 expect(rebuildPlanState(first.nextPlan,first.nextRecords,first.nextRecords,options)).toEqual(first)
})

it('keeps fractional shares across multiple derived records',()=>{
 const plan={id:'fractional-many',strategy:'DCA',budgetMode:'fixed',totalBudget:10000,totalPeriods:12,reserveRatio:0,createdAt:'2026-01-01',assets:[{ticker:'SPY',weight:1,initialSharesOriginal:0,currentShares:0}]}
 const records=[1,2,3].map((periodIndex)=>({id:`fractional-${periodIndex}`,planId:plan.id,periodIndex,date:`2026-01-0${periodIndex+1}`,assets:[{ticker:'SPY',price:1,actualShares:.123,actualAmount:.12}],totalActualAmount:.12}))
 const rebuilt=rebuildPlanState(plan,records,records,{asOfDate:'2026-03-01'})
 expect(rebuilt.nextRecords.find(r=>r.periodIndex===2).assets[0].trackedShares).toBeCloseTo(.246,8)
 expect(rebuilt.nextPlan.assets[0].currentShares).toBeCloseTo(.369,8)
})

it('keeps fractional initial holdings precise through a split in VA history',()=>{
 const plan={id:'va-fractional',strategy:'VA',budgetMode:'fixed',totalBudget:10000,totalPeriods:12,reserveRatio:0,createdAt:'2026-01-01',assets:[{ticker:'SPY',weight:1,initialSharesOriginal:.12345678,initialAverageCostOriginal:120,currentShares:.12345678}],splitEvents:[{id:'reverse',ticker:'SPY',effectiveDate:'2026-02-01',newShares:1,oldShares:4}]}
 const records=[
  {id:'va-fractional-r1',planId:plan.id,periodIndex:0,date:'2026-01-15',assets:[{ticker:'SPY',price:120,actualShares:.1001,actualAmount:12.01}],totalActualAmount:12.01},
  {id:'va-fractional-r2',planId:plan.id,periodIndex:1,date:'2026-02-02',assets:[{ticker:'SPY',price:480,actualShares:0,actualAmount:0}],totalActualAmount:0},
 ]
 const rebuilt=rebuildPlanState(plan,records,records,{asOfDate:'2026-03-01'})
 expect(rebuilt.nextRecords.find(r=>r.periodIndex===1).assets[0].trackedShares).toBeCloseTo(.025025,8)
})
