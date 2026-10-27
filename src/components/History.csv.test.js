import { describe, expect, it } from 'vitest'
import { toCsv } from './History'

describe('History CSV export', () => {
  it('escapes RFC 4180 fields and neutralizes spreadsheet formulas', () => {
    const csv = toCsv([{
      periodIndex: 0,
      date: '2026-01-01',
      tag: 'normal',
      note: 'memo, "quoted"\nnext',
      totalActualAmount: 1,
      cumulativeInvested: 1,
      remainingBudget: 2,
      assets: [{ ticker: '=CMD', price: 1, priceSource: '+feed', targetValue: 1, currentValueBefore: 0, requiredAmount: 1, suggestedShares: 1, actualShares: 1, actualAmount: 1 }],
    }])
    expect(csv).toContain('"memo, ""quoted""\nnext"')
    expect(csv).toContain("'=CMD")
    expect(csv).toContain("'+feed")
  })
  it('exports the business execution date from a supported legacy ISO value', () => {
    const csv = toCsv([{ periodIndex: 0, date: ' 2024-02-29T23:59:59.000-08:00 ', tag: 'normal', assets: [{ ticker: 'SPY', price: 120, actualShares: 2.5, actualAmount: 300 }] }])
    expect(csv).toContain('2024-02-29')
    expect(csv).not.toContain('1970-01-01')
  })
})
