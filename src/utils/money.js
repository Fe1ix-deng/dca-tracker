import { normalizeMarket } from './marketPrecision'

export function getCurrency(marketOrPlan) {
  return normalizeMarket(marketOrPlan) === 'CN' ? 'CNY' : 'USD'
}

export function formatMoney(value, marketOrPlan) {
  const numeric = Number(value) || 0
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: getCurrency(marketOrPlan),
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numeric)
}

export function formatSignedMoney(value, marketOrPlan) {
  const numeric = Number(value) || 0
  return `${numeric >= 0 ? '+' : '-'}${formatMoney(Math.abs(numeric), marketOrPlan)}`
}
