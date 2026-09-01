import { describe, expect, it } from 'vitest'
import * as usePlanModule from './usePlan'

describe('normalizePlanState', () => {
  it('defaults legacy plans without a market to US', () => {
    const state = usePlanModule.normalizePlanState?.([
      { id: 'legacy', assets: [] },
    ])

    expect(state?.plans[0]?.market).toBe('US')
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
