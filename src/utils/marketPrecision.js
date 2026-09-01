import { normalizeNumericInput } from './numericInput'

export function normalizeMarket(value) {
  return (value?.market ?? value) === 'CN' ? 'CN' : 'US'
}

export function getPriceDecimals(marketOrPlan) {
  return normalizeMarket(marketOrPlan) === 'CN' ? 3 : 2
}

export function roundPrice(value, marketOrPlan) {
  const decimals = getPriceDecimals(marketOrPlan)
  return Number(value.toFixed(decimals))
}

export function formatPrice(value, marketOrPlan) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: getPriceDecimals(marketOrPlan),
  }).format(value)
}

export function normalizePriceInput(value, marketOrPlan) {
  return normalizeNumericInput(value, { decimalPlaces: getPriceDecimals(marketOrPlan) })
}
