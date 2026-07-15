const HISTORICAL_YIELDS = {
  TQQQ: 0.38,
  QLD: 0.34,
  QQQ: 0.19,
  QQQM: 0.19,
  SPY: 0.14,
  VOO: 0.14,
  IVV: 0.14,
  VTI: 0.14,
  VT: 0.12,
  SPMO: 0.18,
  GOOGL: 0.23,
  GOOG: 0.23,
  // TSLA 的长期 CAGR 很高，主要受到 2019-2021 爆发式上涨显著拉动，历史高收益不代表未来表现。
  TSLA: 0.45,
  'BRK.B': 0.13,
  BRKB: 0.13,
  IBIT: 0.5,
  BITO: 0.45,
  _default: 0.15,
}

const DEFAULT_YIELD = HISTORICAL_YIELDS._default

function roundTo4(value) {
  return Number((Number(value) || 0).toFixed(4))
}

function roundDownToStep(value, step = 0.05) {
  const numeric = Number(value) || 0
  const ratio = numeric / step
  // Floating point division can land just under a whole step (e.g. 0.15 / 0.05
  // evaluates to 2.9999999999999996 in JS), which would silently floor down to
  // the wrong bucket. Snapping the ratio to 8 decimal places before flooring
  // corrects for that representation error without affecting real fractional
  // values.
  const correctedRatio = Math.round(ratio * 1e8) / 1e8
  // The final multiplication (e.g. 3 * 0.05) can itself reintroduce tiny
  // float noise (0.15000000000000002), so round once more before returning.
  return roundTo4(Math.floor(correctedRatio) * step)
}

export function estimateTargetYield(assets = []) {
  const safeAssets = Array.isArray(assets) ? assets : []
  const totalWeight = safeAssets.reduce((sum, asset) => sum + (Number(asset.weight) || 0), 0)

  if (!safeAssets.length || totalWeight <= 0) {
    return {
      estimatedYield: 0.15,
      minYield: 0.1,
      maxYield: 0.2,
      breakdown: [],
    }
  }

  const weightedYield = safeAssets.reduce((sum, asset) => {
    const ticker = String(asset.ticker || '').trim().toUpperCase()
    const weight = Number(asset.weight) || 0
    const referenceYield = HISTORICAL_YIELDS[ticker] ?? DEFAULT_YIELD
    return sum + referenceYield * weight
  }, 0)

  const normalizedYield = weightedYield / totalWeight
  const estimatedYield = Math.max(0.05, roundDownToStep(normalizedYield, 0.05))

  return {
    estimatedYield,
    minYield: roundTo4(Math.max(0.05, estimatedYield - 0.05)),
    maxYield: roundTo4(estimatedYield + 0.05),
    breakdown: safeAssets.map((asset) => {
      const ticker = String(asset.ticker || '').trim().toUpperCase()
      return {
        ticker,
        weight: Number(asset.weight) || 0,
        referenceYield: HISTORICAL_YIELDS[ticker] ?? DEFAULT_YIELD,
      }
    }),
  }
}

export { DEFAULT_YIELD, HISTORICAL_YIELDS }
