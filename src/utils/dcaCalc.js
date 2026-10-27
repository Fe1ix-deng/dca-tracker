import { getDeployableBudget } from './budget'

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

export function getPeriodicAmount(plan = {}, assetWeight = 0) {
  if (plan?.budgetMode === 'open-ended') {
    return roundToTwo((Number(plan.periodicTarget) || 0) * (Number(assetWeight) || 0))
  }

  const deployableBudget = getDeployableBudget(plan)
  const totalPeriods = Math.max(1, Number(plan.totalPeriods) || 1)
  return roundToTwo((deployableBudget * (Number(assetWeight) || 0)) / totalPeriods)
}

export function getSuggestedShares(periodicAmount, currentPrice) {
  const price = Number(currentPrice) || 0
  if (price <= 0) return 0
  return Math.floor(Math.max(0, (Number(periodicAmount) || 0) / price) * 100) / 100
}

export function calculateDcaProjection({ amount = 0, price = 0 }) {
  const periodicAmount = roundToTwo(amount)
  return {
    shares: getSuggestedShares(periodicAmount, price),
    estimatedCost: periodicAmount,
  }
}
