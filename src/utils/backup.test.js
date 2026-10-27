import { describe, expect, it } from 'vitest'
import * as backupModule from './backup'

const { buildBackupPayload } = backupModule

describe('buildBackupPayload', () => {
  const planA = { id: 'plan-a', name: 'Plan A' }
  const planB = { id: 'plan-b', name: 'Plan B' }
  const records = [{ id: 'record-1', planId: 'plan-a', periodIndex: 0, date: '2026-01-02T23:00:00.000-08:00', assets: [] }]

  it('includes every plan when a full plans list is provided', () => {
    // Regression test: exporting used to only ever include the single
    // active plan, silently dropping other plans from the backup file.
    const payload = buildBackupPayload(planA, [planA, planB], records)

    expect(payload.plans).toEqual([planA, planB])
    expect(payload.plan).toBe(planA)
    expect(payload.activePlanId).toBe('plan-a')
    expect(payload.records[0]).toMatchObject({ id: 'record-1', date: '2026-01-02' })
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
  it('canonicalizes supported legacy execution dates on export without changing transaction values', () => {
    const record = { id: 'r', planId: 'plan-a', periodIndex: 0, date: ' 2024-02-29T23:59:59.000-08:00 ', assets: [{ ticker: 'SPY', price: 120, actualShares: 2.5, actualAmount: 300 }], totalActualAmount: 300 }
    const payload = buildBackupPayload({ id: 'plan-a', assets: [{ ticker: 'SPY' }] }, [{ id: 'plan-a', assets: [{ ticker: 'SPY' }] }], [record])
    expect(payload.records[0]).toMatchObject({ date: '2024-02-29', totalActualAmount: 300 })
    expect(payload.records[0].assets[0]).toMatchObject({ price: 120, actualShares: 2.5, actualAmount: 300 })
  })

  it('round-trips an explicit empty backup for clearing an empty or existing library', () => {
    const parsed = backupModule.parseBackupPayload(JSON.parse(JSON.stringify(buildBackupPayload(null, [], []))))
    expect(parsed).toEqual({ plans: [], plan: null, activePlanId: null, records: [] })
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
      plans: [{ id: 'plan-a', assets: [] }, { id: 'plan-b', assets: [] }],
      activePlanId: 'plan-b',
      records: [{ id: 'record-1', planId: 'plan-b', periodIndex: 0, date: ' 2026-01-02T23:00:00.000-08:00 ', assets: [] }],
    })

    expect(parsed.activePlanId).toBe('plan-b')
    expect(parsed.records[0]).toMatchObject({ id: 'record-1', date: '2026-01-02' })
    expect(parsed.plans).toHaveLength(2)
  })

  it('keeps legacy single-plan backups compatible', () => {
    const parsed = backupModule.parseBackupPayload?.({
      plan: { id: 'legacy-plan' },
      records: [],
    })

    expect(parsed?.plans[0]).toMatchObject({ id: 'legacy-plan' })
    expect(parsed?.activePlanId).toBe('legacy-plan')
  })
  it('normalizes legacy ISO execution dates without inventing 1970', () => {
    const parsed = backupModule.parseBackupPayload?.({
      plan: { id: 'legacy-plan', assets: [] },
      records: [{ id: 'record-1', planId: 'legacy-plan', periodIndex: 0, date: '2024-02-29T23:59:59.000-08:00', assets: [] }],
    })
    expect(parsed.records[0].date).toBe('2024-02-29')
    expect(JSON.stringify(parsed)).not.toContain('1970-01-01')
  })
})
