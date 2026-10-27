import { canonicalTicker, TICKER_RE } from './planConstraints'
import { parseCalendarDate } from './executionDate'
export function inspectAssetIntegrity({ plans = [], records = [] } = {}) {
  const issues = [], byPlanId = {}
  const add = (planId, code, path, ticker = '') => {
    const issue = { planId, code, path, ticker }; issues.push(issue)
    if (byPlanId[planId]) { byPlanId[planId].issues.push(issue); byPlanId[planId].needsRepair = true }
  }
  const planList = Array.isArray(plans) ? plans : []
  planList.forEach((plan, i) => {
    if (!plan || typeof plan.id !== 'string' || !plan.id) { add(null, 'invalidPlan', `plans[${i}]`); return }
    if (byPlanId[plan.id]) { add(plan.id, 'duplicatePlan', `plans[${i}]`); return }
    byPlanId[plan.id] = { needsRepair: false, protectedTickers: new Set(), issues: [], originalPlan: plan }
  })
  planList.forEach((plan, i) => {
    if (!byPlanId[plan?.id]) return
    const seen = new Set()
    if (plan.assets !== undefined && !Array.isArray(plan.assets)) add(plan.id, 'invalidAssets', `plans[${i}].assets`)
    ;(Array.isArray(plan.assets) ? plan.assets : []).forEach((asset, j) => {
      const ticker = canonicalTicker(asset?.ticker)
      if (!TICKER_RE.test(ticker)) add(plan.id, 'invalidTicker', `plans[${i}].assets[${j}]`, ticker)
      if (seen.has(ticker)) add(plan.id, 'duplicateTicker', `plans[${i}].assets[${j}]`, ticker)
      seen.add(ticker)
    })
    const eventIds = new Set()
    if (plan.splitEvents != null && !Array.isArray(plan.splitEvents)) add(plan.id, 'invalidEvents', `plans[${i}].splitEvents`)
    ;(Array.isArray(plan.splitEvents) ? plan.splitEvents : []).forEach((event, j) => {
      const ticker = canonicalTicker(event?.ticker), path = `plans[${i}].splitEvents[${j}]`
      byPlanId[plan.id].protectedTickers.add(ticker)
      if (!parseCalendarDate(event?.effectiveDate) || !Number.isFinite(Number(event?.newShares)) || Number(event?.newShares) <= 0 || !Number.isFinite(Number(event?.oldShares)) || Number(event?.oldShares) <= 0) add(plan.id, 'invalidEvent', path, ticker)
      if (!seen.has(ticker)) add(plan.id, 'orphanEvent', path, ticker)
      if (!event?.id || eventIds.has(event.id)) add(plan.id, 'duplicateEvent', path, ticker)
      eventIds.add(event?.id)
    })
  })
  const recordIds = new Map()
  ;(Array.isArray(records) ? records : []).forEach((record, i) => {
    const entry = byPlanId[record?.planId], path = `records[${i}]`
    if (!entry) { add(record?.planId, 'orphanPlan', path); return }
    if (!record?.id || recordIds.has(record.id)) {
      add(record.planId, 'duplicateRecord', path)
      const oldId = recordIds.get(record?.id); if (oldId && oldId !== record.planId) add(oldId, 'duplicateRecord', path)
    }
    recordIds.set(record?.id, record.planId)
    const tickers = new Set((Array.isArray(entry.originalPlan.assets) ? entry.originalPlan.assets : []).map(a => canonicalTicker(a?.ticker))), seen = new Set()
    if (record.assets !== undefined && !Array.isArray(record.assets)) add(record.planId, 'invalidRecordAssets', `${path}.assets`)
    ;(Array.isArray(record.assets) ? record.assets : []).forEach((asset, j) => {
      const ticker = canonicalTicker(asset?.ticker)
      entry.protectedTickers.add(ticker)
      if (!tickers.has(ticker)) add(record.planId, 'orphanAsset', `${path}.assets[${j}]`, ticker)
      if (seen.has(ticker)) add(record.planId, 'duplicateRecordAsset', `${path}.assets[${j}]`, ticker)
      seen.add(ticker)
    })
  })
  return { issues, byPlanId }
}
export function validateAssetIdentityChange(originalPlan, candidatePlan, records = []) {
  if (!originalPlan) return []
  const info = inspectAssetIntegrity({ plans: [originalPlan], records: records.filter(r => r?.planId === originalPlan.id) }).byPlanId[originalPlan.id]
  if (info?.needsRepair) return [{ field: 'assets', code: 'needsRepair', params: {} }]
  const candidates = new Set((candidatePlan.assets || []).map(a => canonicalTicker(a.ticker)))
  return [...(info?.protectedTickers || [])].filter(ticker => !candidates.has(ticker)).map(ticker => ({ field: 'assets', code: 'protectedTicker', params: { ticker } }))
}
