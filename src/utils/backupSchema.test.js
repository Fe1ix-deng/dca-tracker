import { describe, expect, it } from 'vitest'
import { validateAndNormalizeBackup } from './backupSchema'

const plan = { id: 'p1', market: 'CN', budgetMode: 'fixed', totalPeriods: 12, targetAnnualReturn: 0.1, reserveRatio: 0.2, assets: [{ ticker: '600519', currentShares: 0, initialAverageCost: 1, weight: 1 }] }
const record = { id: 'r1', planId: 'p1', periodIndex: 0, date: '2026-01-01', assets: [{ ticker: '600519', price: 1, actualShares: 1 }] }

describe('backup schema validation', () => {
  it('normalizes valid plans, tickers, and records', () => {
    const result = validateAndNormalizeBackup({ plans: [{ ...plan, assets: [{ ...plan.assets[0], ticker: '600519' }] }], records: [record] })
    expect(result.plans[0].assets[0].ticker).toBe('600519')
  })
  it.each([
    ['duplicate ticker', { ...plan, assets: [{ ticker: 'QQQ' }, { ticker: 'qqq' }] }],
    ['invalid reserve', { ...plan, reserveRatio: 0.31 }],
    ['orphan record', { plans: [plan], records: [{ ...record, planId: 'missing' }] }],
    ['invalid price', { plans: [plan], records: [{ ...record, assets: [{ ticker: '600519', price: -1, actualShares: 1 }] }] }],
  ])('rejects %s', (_, payload) => {
    expect(() => validateAndNormalizeBackup(payload.plans ? payload : { plans: [payload] })).toThrow()
  })
  it('rejects invalid returns rather than silently correcting them', () => {
    expect(() => validateAndNormalizeBackup({ plans: [{ ...plan, targetAnnualReturn: -2 }] })).toThrow(/targetAnnualReturn/)
    expect(() => validateAndNormalizeBackup({ plans: [{ ...plan, targetAnnualReturn: Number.POSITIVE_INFINITY }] })).toThrow(/targetAnnualReturn/)
  })
  it('rejects huge period counts before allocation', () => {
    expect(() => validateAndNormalizeBackup({ plans: [{ ...plan, totalPeriods: Number.MAX_SAFE_INTEGER }] })).toThrow(/totalPeriods/)
  })
})
