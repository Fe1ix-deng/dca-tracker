export const BACKUP_LIMITS = Object.freeze({ maxPlans: 50, maxAssets: 100, maxRecords: 5000, maxRecordAssets: 100, maxPeriods: 10000 })
export const MAX_PERIODS = BACKUP_LIMITS.maxPeriods
export const OPEN_ENDED_PLACEHOLDER_PERIODS = 9999
export const MAX_RESERVE_RATIO = 0.3
export const TICKER_RE = /^[A-Z0-9][A-Z0-9.-]{0,19}$/
export const WEIGHT_SUM_TOLERANCE = 1e-6
export const canonicalTicker = value => typeof value === 'string' ? value.trim().toUpperCase() : ''
export function draftNumber(value, optional = false) {
  if (value === '' || value === null || value === undefined || (typeof value === 'string' && !value.trim())) return optional ? 0 : NaN
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) return NaN
  const number = Number(value)
  return Number.isFinite(number) ? number : NaN
}
