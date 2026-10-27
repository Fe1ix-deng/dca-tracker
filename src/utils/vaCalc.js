import { getDeployableBudget } from './budget'

function roundToTwo(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return 0
  return Number(numeric.toFixed(2))
}

const MAX_TARGET_VALUE = Number.MAX_SAFE_INTEGER

function getPeriodsPerYear(frequency = 'monthly') {
  return frequency === 'biweekly' ? 26 : 12
}

function isOpenEndedPlan(plan = {}) {
  return plan?.budgetMode === 'open-ended'
}

function getPeriodicGrowthRate(plan = {}) {
  const rawAnnualReturn = Number(plan.targetAnnualReturn)
  const annualReturn = Number.isFinite(rawAnnualReturn) && rawAnnualReturn > -1
    ? Math.min(rawAnnualReturn, 10)
    : 0
  return Math.pow(1 + annualReturn, 1 / getPeriodsPerYear(plan.frequency)) - 1
}

function getAccumulatedTarget(contribution, periodIndex, growthRate) {
  const periods = periodIndex + 1
  if (!Number.isFinite(contribution) || contribution <= 0) return 0
  if (!Number.isFinite(growthRate) || growthRate <= -1) return roundToTwo(contribution)
  if (Math.abs(growthRate) < 1e-12) return roundToTwo(Math.min(MAX_TARGET_VALUE, contribution * periods))

  const logGrowth = Math.log1p(growthRate)
  const exponent = periods * logGrowth
  if (!Number.isFinite(exponent) || exponent > Math.log(MAX_TARGET_VALUE / contribution)) {
    return MAX_TARGET_VALUE
  }
  const growthFactor = Math.exp(exponent)
  const target = contribution * ((growthFactor - 1) / growthRate)
  return roundToTwo(Math.min(MAX_TARGET_VALUE, target))
}

function getAssetPeriodicContribution(assetWeight, plan = {}) {
  if (isOpenEndedPlan(plan)) {
    return roundToTwo((Number(plan.periodicTarget) || 0) * (Number(assetWeight) || 0))
  }

  const deployableBudget = getDeployableBudget(plan)
  const totalPeriods = Math.max(1, Number(plan.totalPeriods) || 1)
  return roundToTwo((deployableBudget * (Number(assetWeight) || 0)) / totalPeriods)
}

function getInitialTargetValue(assetWeight, plan = {}) {
  return getAssetPeriodicContribution(assetWeight, plan)
}

export function getTargetValue(periodIndex, assetWeight, plan = {}) {
  const normalizedPeriodIndex = Math.max(0, Number(periodIndex) || 0)
  const normalizedAssetWeight = Number(assetWeight) || 0
  const growthRate = getPeriodicGrowthRate(plan)

  if (isOpenEndedPlan(plan)) {
    const periodicContribution = getAssetPeriodicContribution(normalizedAssetWeight, plan)

    if (normalizedPeriodIndex === 0) {
      return roundToTwo(periodicContribution)
    }

    return getAccumulatedTarget(periodicContribution, normalizedPeriodIndex, growthRate)
  }

  const firstTarget = getInitialTargetValue(normalizedAssetWeight, plan)

  if (normalizedPeriodIndex === 0) {
    return firstTarget
  }

  const periodicContribution = getAssetPeriodicContribution(normalizedAssetWeight, plan)
  return getAccumulatedTarget(periodicContribution, normalizedPeriodIndex, growthRate)
}

export function getRequiredInvestment(currentValue, targetValue) {
  return roundToTwo(Math.max(0, (Number(targetValue) || 0) - (Number(currentValue) || 0)))
}

export function getSuggestedShares(requiredAmount, currentPrice) {
  const price = Number(currentPrice) || 0
  if (price <= 0) return 0
  return Math.floor(Math.max(0, (Number(requiredAmount) || 0) / price) * 100) / 100
}

export function getUpdatedShares(previousShares, actualSharesBought) {
  return roundToTwo((Number(previousShares) || 0) + (Number(actualSharesBought) || 0))
}

export function getTrackedShares(currentShares, initialShares) {
  return Number(Math.max(0, (Number(currentShares) || 0) - (Number(initialShares) || 0)).toFixed(8))
}

export { getPeriodicGrowthRate }

export function calcAllTargets(plan = {}) {
  const assets = Array.isArray(plan.assets) ? plan.assets : []
  // Open-ended plans used to always compute a fixed 9999-period matrix here,
  // regardless of how far the plan had actually progressed. Every caller only
  // ever reads up to index `plan.currentPeriod` (the next period to preview
  // in OperationPanel; rebuildPlanState only iterates over this plan's own
  // records, whose count rebuildPlanState itself keeps in sync with
  // currentPeriod). So `currentPeriod + 1` rows is always enough, and it
  // grows naturally with real usage instead of doing ~50M wasted iterations
  // per asset on every save/edit for a brand new plan.
  const totalPeriods = isOpenEndedPlan(plan)
    ? Math.max(Number(plan.currentPeriod) || 0, 0) + 1
    : Math.max(0, Number(plan.totalPeriods) || 0)
  const boundedPeriods = Math.min(10000, totalPeriods)

  return Array.from({ length: boundedPeriods }, (_, periodIndex) =>
    assets.map((asset) => getTargetValue(periodIndex, Number(asset.weight) || 0, plan)),
  )
}

export function calculateVaRecommendation({
  targetValue = 0,
  currentValue = 0,
  price = 0,
}) {
  const requiredAmount = getRequiredInvestment(currentValue, targetValue)

  return {
    suggestedAmount: requiredAmount,
    suggestedShares: getSuggestedShares(requiredAmount, price),
    gap: roundToTwo((Number(targetValue) || 0) - (Number(currentValue) || 0)),
  }
}

export { getInitialTargetValue }
