import { normalizeMarket, roundPrice } from './marketPrecision'
import { parseExecutionDate } from './executionDate'
import { inspectAssetIntegrity } from './assetIntegrity'

import { BACKUP_LIMITS, TICKER_RE } from './planConstraints'
export { BACKUP_LIMITS } from './planConstraints'

export class BackupValidationError extends Error {
  constructor(message) { super(`备份校验失败：${message}`); this.name = 'BackupValidationError' }
}

function fail(path, message) { throw new BackupValidationError(`${path} ${message}`) }
function finiteNonNegative(value, path, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) fail(path, '必须是有限非负数字')
  return number
}
function finiteReturn(value, path) {
  const number = Number(value ?? 0)
  if (!Number.isFinite(number) || number <= -1 || number > 10) fail(path, '必须大于 -1 且不超过 10')
  return number
}
function integerBound(value, path, fallback, min = 0) {
  const number = Number(value ?? fallback)
  if (!Number.isSafeInteger(number) || number < min || number > BACKUP_LIMITS.maxPeriods) fail(path, `必须是 ${min} 到 ${BACKUP_LIMITS.maxPeriods} 的整数`)
  return number
}
function normalizeTicker(value, path) {
  if (typeof value !== 'string' || !value.trim()) fail(path, '必须是非空字符串')
  const ticker = value.trim().toUpperCase()
  if (!TICKER_RE.test(ticker)) fail(path, '包含非法字符')
  return ticker
}

export function normalizePlan(plan, index = 0) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) fail(`plans[${index}]`, '必须是对象')
  if (typeof plan.id !== 'string' || !plan.id.trim()) fail(`plans[${index}].id`, '必须是非空字符串')
  const assets = plan.assets === undefined ? [] : plan.assets
  if (!Array.isArray(assets) || assets.length > BACKUP_LIMITS.maxAssets) fail(`plans[${index}].assets`, `数量不能超过 ${BACKUP_LIMITS.maxAssets}`)
  const seen = new Set()
  const market = normalizeMarket(plan.market)
  const normalizedAssets = assets.map((asset, assetIndex) => {
    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) fail(`plans[${index}].assets[${assetIndex}]`, '必须是对象')
    const ticker = normalizeTicker(asset.ticker, `plans[${index}].assets[${assetIndex}].ticker`)
    if (seen.has(ticker)) fail(`plans[${index}].assets`, `ticker ${ticker} 重复`)
    seen.add(ticker)
    return { ...asset, ticker, weight: finiteNonNegative(asset.weight, `plans[${index}].assets[${assetIndex}].weight`), currentShares: finiteNonNegative(asset.currentShares, `plans[${index}].assets[${assetIndex}].currentShares`), initialShares: finiteNonNegative(asset.initialShares, `plans[${index}].assets[${assetIndex}].initialShares`), initialAverageCost: roundPrice(finiteNonNegative(asset.initialAverageCost, `plans[${index}].assets[${assetIndex}].initialAverageCost`), market) }
  })
  const budgetMode = plan.budgetMode === 'open-ended' ? 'open-ended' : 'fixed'
  const totalPeriods = integerBound(plan.totalPeriods, `plans[${index}].totalPeriods`, budgetMode === 'open-ended' ? 9999 : 1, budgetMode === 'open-ended' ? 0 : 1)
  const currentPeriod = integerBound(plan.currentPeriod, `plans[${index}].currentPeriod`, 0)
  const reserveRatio = finiteNonNegative(plan.reserveRatio, `plans[${index}].reserveRatio`, budgetMode === 'open-ended' ? 0 : 0.2)
  if (reserveRatio > 0.3) fail(`plans[${index}].reserveRatio`, '必须在 0 到 0.3 之间')
  return { ...plan, id: plan.id.trim(), market, budgetMode, totalPeriods, currentPeriod, targetAnnualReturn: finiteReturn(plan.targetAnnualReturn, `plans[${index}].targetAnnualReturn`), reserveRatio: budgetMode === 'open-ended' ? 0 : reserveRatio, totalBudget: finiteNonNegative(plan.totalBudget, `plans[${index}].totalBudget`), periodicTarget: finiteNonNegative(plan.periodicTarget, `plans[${index}].periodicTarget`), assets: normalizedAssets }
}

export function normalizeRecord(record, index, planById) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) fail(`records[${index}]`, '必须是对象')
  if (typeof record.planId !== 'string' || !planById.has(record.planId)) fail(`records[${index}].planId`, '必须对应导入的计划')
  const periodIndex = Number(record.periodIndex)
  if (!Number.isSafeInteger(periodIndex) || periodIndex < 0 || periodIndex > BACKUP_LIMITS.maxPeriods) fail(`records[${index}].periodIndex`, '必须是合法期数')
  const executionDate = parseExecutionDate(record.date)
  if (!executionDate) fail(`records[${index}].date`, '必须是有效的执行日期')
  if (!Array.isArray(record.assets) || record.assets.length > BACKUP_LIMITS.maxRecordAssets) fail(`records[${index}].assets`, `数量不能超过 ${BACKUP_LIMITS.maxRecordAssets}`)
  const plan = planById.get(record.planId)
  const tickers = new Set(plan.assets.map((asset) => asset.ticker))
  const assets = record.assets.map((asset, assetIndex) => {
    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) fail(`records[${index}].assets[${assetIndex}]`, '必须是对象')
    const ticker = normalizeTicker(asset.ticker, `records[${index}].assets[${assetIndex}].ticker`)
    if (!tickers.has(ticker)) fail(`records[${index}].assets[${assetIndex}].ticker`, '不属于计划资产')
    return { ...asset, ticker, price: finiteNonNegative(asset.price, `records[${index}].assets[${assetIndex}].price`), actualShares: finiteNonNegative(asset.actualShares, `records[${index}].assets[${assetIndex}].actualShares`), currentShares: finiteNonNegative(asset.currentShares, `records[${index}].assets[${assetIndex}].currentShares`), initialAverageCost: finiteNonNegative(asset.initialAverageCost, `records[${index}].assets[${assetIndex}].initialAverageCost`) }
  })
  return { ...record, periodIndex, date: executionDate, assets }
}

export function validateAndNormalizeBackup(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('根对象', '必须是对象')
  const rawPlans = Array.isArray(payload.plans) ? payload.plans : payload.plan ? [payload.plan] : []
  const rawRecords = payload.records === undefined ? [] : payload.records
  if (!Array.isArray(rawPlans) || rawPlans.length > BACKUP_LIMITS.maxPlans) fail('plans', `数量不能超过 ${BACKUP_LIMITS.maxPlans}`)
  if (!Array.isArray(rawRecords) || rawRecords.length > BACKUP_LIMITS.maxRecords) fail('records', `数量不能超过 ${BACKUP_LIMITS.maxRecords}`)
  const integrity = inspectAssetIntegrity({ plans: rawPlans, records: rawRecords })
  if (integrity.issues.length) fail('资产关联', '数据需要修复：' + integrity.issues.map(i => i.path + ' ' + i.code).join('; '))
  const plans = rawPlans.map(normalizePlan)
  const ids = new Set()
  plans.forEach((plan, index) => { if (ids.has(plan.id)) fail(`plans[${index}].id`, '计划 ID 重复'); ids.add(plan.id) })
  const planById = new Map(plans.map((plan) => [plan.id, plan]))
  const records = rawRecords.map((record, index) => normalizeRecord(record, index, planById))
  const activePlanId = payload.activePlanId == null ? plans[0]?.id || null : String(payload.activePlanId)
  if (activePlanId && !planById.has(activePlanId)) fail('activePlanId', '必须对应导入的计划')
  return { plans, plan: plans[0] || null, activePlanId, records }
}
