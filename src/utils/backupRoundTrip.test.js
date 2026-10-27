import { expect, it } from 'vitest'
import { buildBackupPayload, parseBackupPayload } from './backup'

it('round-trips a record business date and transaction values without timezone drift', () => {
  const plan = { id: 'p', assets: [{ ticker: 'SPY' }] }
  const record = { id: 'r', planId: 'p', periodIndex: 0, date: ' 2024-02-29T23:59:59.000-08:00 ', assets: [{ ticker: 'SPY', price: 120, actualShares: 2.5, actualAmount: 300 }], totalActualAmount: 300 }
  const exported = buildBackupPayload(plan, [plan], [record])
  const imported = parseBackupPayload(JSON.parse(JSON.stringify(exported)))
  expect(imported.records[0]).toMatchObject({ date: '2024-02-29', totalActualAmount: 300 })
  expect(imported.records[0].assets[0]).toMatchObject({ price: 120, actualShares: 2.5, actualAmount: 300 })
})
