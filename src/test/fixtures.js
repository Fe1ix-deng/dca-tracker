export const healthyPlan = { id: 'plan-a', name: 'Healthy plan', strategy: 'DCA', market: 'US', budgetMode: 'fixed', totalBudget: 12000, reserveRatio: 0.2, totalPeriods: 12, periodicTarget: 1000, currentPeriod: 0, frequency: 'monthly', targetAnnualReturn: 0, createdAt: '2026-01-01T00:00:00.000Z', splitEvents: [], assets: [{ ticker: 'SPY', name: 'SPY', weight: 1, currentShares: 0, initialShares: 0, initialAverageCost: 0 }] }
export const openPlan = { ...healthyPlan, id: 'open', budgetMode: 'open-ended', totalPeriods: 9999, periodicTarget: 0 }
export const healthyRecord = { id: 'record-a', planId: 'plan-a', periodIndex: 0, date: '2026-01-02', assets: [{ ticker: 'SPY', price: 120, actualShares: 2.5, actualAmount: 300 }], totalActualAmount: 300 }
export const futureSplit = { id: 'split-a', ticker: 'SPY', effectiveDate: '2099-01-01', newShares: 2, oldShares: 1 }
export function faultStorage(initial = {}, failWrites = []) {
  const data = new Map(Object.entries(initial)); const calls = []; let count = 0
  return { data, calls, read: key => data.has(key) ? data.get(key) : null, write(key, value) { calls.push(['write', key, value]); if (failWrites.includes(++count)) throw new Error(`write ${count} failed`); data.set(key, value) }, remove(key) { calls.push(['remove', key]); if (failWrites.includes(++count)) throw new Error(`remove ${count} failed`); data.delete(key) } }
}
