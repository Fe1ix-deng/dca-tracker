import { normalizeNumericInput } from './numericInput'

export function normalizeMarket(value) {
  return (value?.market ?? value) === 'CN' ? 'CN' : 'US'
}

export function getPriceDecimals(marketOrPlan) {
  return normalizeMarket(marketOrPlan) === 'CN' ? 3 : 2
}

export function roundPrice(value, marketOrPlan) {
  const decimals = getPriceDecimals(marketOrPlan)
  let numeric

  try {
    numeric = Number(value)
  } catch {
    return 0
  }

  if (!Number.isFinite(numeric)) {
    return 0
  }

  return Number(numeric.toFixed(decimals))
}

export function formatPrice(value, marketOrPlan) {
  if (value === '' || value === null || value === undefined) {
    return ''
  }

  let numeric

  try {
    numeric = Number(value)
  } catch {
    return ''
  }

  if (!Number.isFinite(numeric)) {
    return ''
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: getPriceDecimals(marketOrPlan),
    useGrouping: false,
  }).format(numeric)
}

export function normalizePriceInput(value, marketOrPlan) {
  return normalizeNumericInput(value, { decimalPlaces: getPriceDecimals(marketOrPlan) })
}
