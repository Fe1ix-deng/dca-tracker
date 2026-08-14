function toPositiveNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

function sumRecordedPosition(records = [], ticker) {
  return records.reduce(
    (summary, record) => {
      const matchedAsset = record.assets?.find((asset) => asset.ticker === ticker)
      if (!matchedAsset) {
        return summary
      }

      return {
        shares: summary.shares + (Number(matchedAsset.adjustedShares ?? matchedAsset.actualShares) || 0),
        cost: summary.cost + (Number(matchedAsset.adjustedActualAmount ?? matchedAsset.actualAmount) || 0),
      }
    },
    { shares: 0, cost: 0 },
  )
}

export function calculateAverageCost(asset, records = []) {
  const currentShares = toPositiveNumber(asset?.currentShares)
  const recordedPosition = sumRecordedPosition(records, asset?.ticker)
  const hasStoredInitialShares = asset?.initialShares !== undefined && asset?.initialShares !== null && asset?.initialShares !== ''
  const initialShares = hasStoredInitialShares
    ? toPositiveNumber(asset.initialShares)
    : Math.max(0, currentShares - recordedPosition.shares)
  const initialAverageCost = toPositiveNumber(asset?.initialAverageCost)
  const needsInitialCost = initialShares > 0

  if (currentShares <= 0) {
    return {
      shares: 0,
      initialShares,
      initialAverageCost,
      recordedShares: recordedPosition.shares,
      recordedCost: recordedPosition.cost,
      averageCost: 0,
      hasKnownCost: true,
    }
  }

  if (needsInitialCost && initialAverageCost <= 0) {
    return {
      shares: currentShares,
      initialShares,
      initialAverageCost,
      recordedShares: recordedPosition.shares,
      recordedCost: recordedPosition.cost,
      averageCost: null,
      hasKnownCost: false,
    }
  }

  if (initialShares <= 0 && recordedPosition.shares <= 0) {
    return {
      shares: currentShares,
      initialShares,
      initialAverageCost,
      recordedShares: recordedPosition.shares,
      recordedCost: recordedPosition.cost,
      averageCost: null,
      hasKnownCost: false,
    }
  }

  const initialCost = initialShares * initialAverageCost
  const totalCost = initialCost + recordedPosition.cost

  return {
    shares: currentShares,
    initialShares,
    initialAverageCost,
    recordedShares: recordedPosition.shares,
    recordedCost: recordedPosition.cost,
    averageCost: totalCost / currentShares,
    hasKnownCost: true,
  }
}

export function calculatePriceGapPct(latestPrice, averageCost) {
  const price = toPositiveNumber(latestPrice)
  const cost = toPositiveNumber(averageCost)

  if (price <= 0 || cost <= 0) {
    return null
  }

  return ((price - cost) / cost) * 100
}

export function calculatePortfolioCostBasis(assets = [], records = []) {
  const summaries = (Array.isArray(assets) ? assets : []).map((asset) => calculateAverageCost(asset, records))
  const hasKnownCost = summaries.every((summary) => summary.hasKnownCost)

  return {
    costBasis: hasKnownCost
      ? Number(summaries.reduce((total, summary) => total + summary.averageCost * summary.shares, 0).toFixed(2))
      : null,
    hasKnownCost,
  }
}
