import { describe, expect, it } from 'vitest'
import * as usePlanModule from './usePlan'

describe('normalizePlanState', () => {
  it('defaults legacy plans without a market to US', () => {
    const state = usePlanModule.normalizePlanState?.([
      { id: 'legacy', assets: [] },
    ])

    expect(state?.plans[0]?.market).toBe('US')
  })

  it('normalizes persisted initial average costs with the plan market precision', () => {
    const state = usePlanModule.normalizePlanState?.([
      {
        id: 'cn',
        market: 'CN',
        assets: [{ ticker: '600519', initialAverageCost: 12.3456 }],
      },
      {
        id: 'us',
        assets: [{ ticker: 'QLD', initialAverageCost: 12.345 }],
      },
    ])

    expect(state?.plans.find((plan) => plan.id === 'cn')?.assets[0]?.initialAverageCost).toBe(12.346)
    expect(state?.plans.find((plan) => plan.id === 'us')?.assets[0]?.initialAverageCost).toBe(12.35)
  })

  it('replaces stale plans with only the imported plan list', () => {
    const importedPlan = { id: 'imported-plan', name: 'Imported plan', assets: [] }

    const state = usePlanModule.normalizePlanState?.([importedPlan], 'imported-plan')

    expect(state).toEqual({
      plans: [expect.objectContaining(importedPlan)],
      activePlanId: 'imported-plan',
    })
  })

  it('deduplicates plan ids and falls back to the first imported plan', () => {
    const state = usePlanModule.normalizePlanState?.([
      { id: 'plan-a', name: 'Original A', assets: [] },
      { id: 'plan-a', name: 'Updated A', assets: [] },
      { id: 'plan-b', name: 'Plan B', assets: [] },
      null,
    ], 'missing-plan')

    expect(state?.plans.map((plan) => [plan.id, plan.name])).toEqual([
      ['plan-a', 'Updated A'],
      ['plan-b', 'Plan B'],
    ])
    expect(state?.activePlanId).toBe('plan-a')
  })
})

describe('removePlanState', () => {
  it('removes a non-active plan without changing the active id', () => {
    const state = usePlanModule.removePlanState?.({
      plans: [{ id: 'a' }, { id: 'b' }],
      activePlanId: 'b',
    }, 'a')

    expect(state).toEqual({
      plans: [{ id: 'b' }],
      activePlanId: 'b',
    })
  })

  it('falls back to the first remaining plan when removing the active plan', () => {
    const state = usePlanModule.removePlanState?.({
      plans: [{ id: 'a' }, { id: 'b' }],
      activePlanId: 'a',
    }, 'a')

    expect(state?.activePlanId).toBe('b')
  })

  it('clears the active id when removing the last plan', () => {
    expect(usePlanModule.removePlanState?.({
      plans: [{ id: 'a' }],
      activePlanId: 'a',
    }, 'a')).toEqual({
      plans: [],
      activePlanId: null,
    })
  })

  it('ignores an unknown plan id', () => {
    const state = { plans: [{ id: 'a' }], activePlanId: 'a' }

    expect(usePlanModule.removePlanState?.(state, 'missing')).toBe(state)
  })
})
