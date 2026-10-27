import { BACKUP_LIMITS, MAX_PERIODS, MAX_RESERVE_RATIO, TICKER_RE, WEIGHT_SUM_TOLERANCE, canonicalTicker, draftNumber } from './planConstraints'
export function validatePlanDraft(form, { existingPlanIds = [], editingPlanId = null, planRecordCount = 0, assetIntegrity } = {}) {
  const errors = [], add = (field, code, params = {}) => errors.push({ field, code, params })
  if (typeof form.name !== 'string' || !form.name.trim()) add('name', 'required')
  if (!['fixed', 'open-ended'].includes(form.budgetMode)) add('budgetMode', 'option')
  if (form.budgetMode === 'open-ended') {
    const n = draftNumber(form.periodicTarget); if (!Number.isFinite(n) || n < 0) add('periodicTarget', 'nonNegative')
  } else {
    const n = draftNumber(form.totalBudget); if (!Number.isFinite(n) || n <= 0) add('totalBudget', 'positive')
  }
  const periods = draftNumber(form.totalPeriods)
  if (!Number.isSafeInteger(periods) || periods < (form.budgetMode === 'open-ended' ? 0 : 1) || periods > MAX_PERIODS || (form.budgetMode !== 'open-ended' && periods < planRecordCount)) add('totalPeriods', 'periods', { max: MAX_PERIODS, records: planRecordCount })
  for (const [field, options] of [['strategy', ['VA','DCA']], ['market',['US','CN']], ['frequency',['monthly','biweekly']]]) if (!options.includes(form[field])) add(field, 'option')
  if (form.budgetMode !== 'open-ended') { const n = draftNumber(form.reserveRatio); if (!Number.isFinite(n) || n < 0 || n > MAX_RESERVE_RATIO) add('reserveRatio','reserve') }
  if (form.strategy === 'VA') { const n = draftNumber(form.targetAnnualReturn); if (!Number.isFinite(n) || n <= -1 || n > 10) add('targetAnnualReturn','annual') }
  const current = draftNumber(form.currentPeriod)
  if (!Number.isSafeInteger(current) || current < 0 || current > MAX_PERIODS) add('currentPeriod','structure')
  const assets = Array.isArray(form.assets) ? form.assets : []
  if (!assets.length || assets.length > BACKUP_LIMITS.maxAssets) add('assets','assetCount')
  const tickers = assets.map(a => canonicalTicker(a?.ticker)), counts = new Map()
  tickers.forEach(t => counts.set(t,(counts.get(t)||0)+1))
  let sum = 0, weightsValid = true
  assets.forEach((asset, i) => {
    const field = `assets[${i}]`, ticker = tickers[i]
    if (!TICKER_RE.test(ticker)) add(`${field}.ticker`,'ticker')
    else if (counts.get(ticker) > 1) add(`${field}.ticker`,'duplicateTicker',{ticker})
    const weight = draftNumber(asset?.weight)
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) { add(`${field}.weight`,'weight'); weightsValid = false } else sum += weight
    for (const prop of ['currentShares','initialAverageCost']) { const n = draftNumber(asset?.[prop],true); if (!Number.isFinite(n) || n < 0) add(`${field}.${prop}`,'nonNegative') }
  })
  if (assets.length && (!weightsValid || Math.abs(sum - 1) > WEIGHT_SUM_TOLERANCE)) add('weights', weightsValid ? 'weightSum' : 'weightUnknown', { sum: sum * 100 })
  if (assetIntegrity?.needsRepair) add('assets','needsRepair')
  if (!editingPlanId && existingPlanIds.length >= BACKUP_LIMITS.maxPlans) add('form','planCount')
  return { isValid: !errors.length, errors, firstErrorField: errors[0]?.field || null }
}
