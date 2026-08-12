function toFinitePositiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

function normalizeDate(value) {
  const text = String(value || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return ''
  }

  const [year, month, day] = text.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? text
    : ''
}

export function parseSplitRatio(input) {
  if (typeof input !== 'string' && typeof input !== 'number') {
    return null
  }

  const match = String(input).trim().match(/^([0-9]+(?:\.[0-9]+)?)\s*:\s*([0-9]+(?:\.[0-9]+)?)$/)
  if (!match) {
    return null
  }

  const newShares = toFinitePositiveNumber(match[1])
  const oldShares = toFinitePositiveNumber(match[2])
  if (!newShares || !oldShares) {
    return null
  }

  return { newShares, oldShares }
}

export function normalizeSplitEvents(events) {
  if (!Array.isArray(events)) {
    return []
  }

  return events
    .filter((event) => event && typeof event === 'object')
    .map((event, index) => {
      const ticker = String(event.ticker || '').trim().toUpperCase()
      const effectiveDate = normalizeDate(event.effectiveDate)
      const newShares = toFinitePositiveNumber(event.newShares)
      const oldShares = toFinitePositiveNumber(event.oldShares)

      if (!ticker || !effectiveDate || !newShares || !oldShares) {
        return null
      }

      return {
        id: String(event.id || `split-${effectiveDate}-${ticker}-${index}`),
        ticker,
        effectiveDate,
        newShares,
        oldShares,
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.effectiveDate.localeCompare(right.effectiveDate) || left.id.localeCompare(right.id))
}

function getEventFactor(event) {
  return event.newShares / event.oldShares
}

export function getSplitFactor(ticker, sourceDate, events, asOfDate = new Date().toISOString().slice(0, 10)) {
  const normalizedTicker = String(ticker || '').trim().toUpperCase()
  const normalizedSourceDate = normalizeDate(sourceDate)
  const normalizedAsOfDate = normalizeDate(asOfDate) || '9999-12-31'

  if (!normalizedTicker || !normalizedSourceDate) {
    return 1
  }

  return normalizeSplitEvents(events)
    .filter((event) => event.ticker === normalizedTicker)
    .filter((event) => event.effectiveDate > normalizedSourceDate && event.effectiveDate <= normalizedAsOfDate)
    .reduce((factor, event) => factor * getEventFactor(event), 1)
}

export function getSplitFactorBetween(ticker, sourceDate, targetDate, events) {
  return getSplitFactor(ticker, sourceDate, events, targetDate)
}

export function adjustAssetForSplit(asset, factor = 1) {
  const safeFactor = toFinitePositiveNumber(factor) || 1
  const rawPrice = Number(asset?.price) || 0
  const rawShares = Number(asset?.actualShares) || 0

  return {
    ...asset,
    adjustedShares: Number((rawShares * safeFactor).toFixed(8)),
    adjustedPrice: Number((rawPrice / safeFactor).toFixed(8)),
    splitFactor: safeFactor,
  }
}

export function adjustHoldingForSplit(shares, averageCost, factor = 1) {
  const safeFactor = toFinitePositiveNumber(factor) || 1
  return {
    shares: Number(((Number(shares) || 0) * safeFactor).toFixed(8)),
    averageCost: Number(((Number(averageCost) || 0) / safeFactor).toFixed(8)),
  }
}

export { normalizeDate }
