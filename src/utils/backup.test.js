import { describe, expect, it } from 'vitest'
import * as backupModule from './backup'

const { buildBackupPayload } = backupModule

describe('buildBackupPayload', () => {
  const planA = { id: 'plan-a', name: 'Plan A' }
  const planB = { id: 'plan-b', name: 'Plan B' }
  const records = [{ id: 'record-1', planId: 'plan-a' }]

  it('includes every plan when a full plans list is provided', () => {
    // Regression test: exporting used to only ever include the single
    // active plan, silently dropping other plans from the backup file.
    const payload = buildBackupPayload(planA, [planA, planB], records)

    expect(payload.plans).toEqual([planA, planB])
    expect(payload.plan).toBe(planA)
    expect(payload.activePlanId).toBe('plan-a')
    expect(payload.records).toBe(records)
    expect(payload.version).toBe('2.0')
    expect(typeof payload.exportedAt).toBe('string')
  })

  it('falls back to the single active plan when no plans list is available', () => {
    const payload = buildBackupPayload(planA, undefined, records)

    expect(payload.plans).toEqual([planA])
  })

  it('produces an empty plans array when there is no active plan', () => {
    const payload = buildBackupPayload(null, [], [])

    expect(payload.plans).toEqual([])
    expect(payload.activePlanId).toBeNull()
    expect(payload.records).toEqual([])
  })
})

describe('parseBackupPayload', () => {
  it('preserves a plan market through a serialized backup round-trip', () => {
    const plan = { id: 'cn-plan', name: 'China plan', market: 'CN', assets: [] }
    const payload = buildBackupPayload(plan, [plan], [])
    const parsed = backupModule.parseBackupPayload?.(JSON.parse(JSON.stringify(payload)))

    expect(parsed?.plans[0]?.market).toBe('CN')
    expect(parsed?.plan?.market).toBe('CN')
  })

  it('normalizes a multi-plan backup and preserves the active plan', () => {
    const parsed = backupModule.parseBackupPayload?.({
      plans: [{ id: 'plan-a' }, { id: 'plan-b' }],
      activePlanId: 'plan-b',
      records: [{ id: 'record-1', planId: 'plan-b' }],
    })

    expect(parsed).toEqual({
      plans: [{ id: 'plan-a' }, { id: 'plan-b' }],
      plan: { id: 'plan-a' },
      activePlanId: 'plan-b',
      records: [{ id: 'record-1', planId: 'plan-b' }],
    })
  })

  it('keeps legacy single-plan backups compatible', () => {
    const parsed = backupModule.parseBackupPayload?.({
      plan: { id: 'legacy-plan' },
      records: [],
    })

    expect(parsed?.plans).toEqual([{ id: 'legacy-plan' }])
    expect(parsed?.activePlanId).toBe('legacy-plan')
  })
})
