import { downloadFile } from './download'
import { markBackedUp, STORAGE_KEYS } from './storage'

export const BACKUP_SCHEMA_VERSION = '2.0'

function safeParseJson(raw, fallback) {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

// Builds the full backup payload. Falls back to the single active plan only
// when a full plans list isn't available, so older call sites stay safe.
export function buildBackupPayload(plan, plans, records) {
  const safePlans = Array.isArray(plans) && plans.length
    ? plans
    : plan
      ? [plan]
      : []

  return {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    plans: safePlans,
    activePlanId: plan?.id || null,
    plan,
    records: Array.isArray(records) ? records : [],
  }
}

export function buildBackupFilename(date = new Date(), label = '') {
  const suffix = label ? `-${label}` : ''
  return `dca-backup${suffix}-${date.toISOString().slice(0, 10)}.json`
}

// Triggers the JSON backup download and records the backup timestamp so the
// reminder banner knows the current data is safely exported. Pass a `label`
// (e.g. "pre-import") to distinguish safety snapshots from regular exports.
export function downloadBackupJson(plan, plans, records, { label = '' } = {}) {
  const payload = buildBackupPayload(plan, plans, records)
  downloadFile(buildBackupFilename(new Date(), label), JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;')
  markBackedUp()
  return payload
}

// Last resort for the error boundary: the app has already crashed, so this
// reads each localStorage key directly and independently (never through
// React state or hooks) and tolerates any single key being missing or
// corrupted rather than letting one bad field lose every other key's data.
export function rescueRawBackup() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null
  }

  const plans = safeParseJson(window.localStorage.getItem(STORAGE_KEYS.plans), [])
  const activePlanId = safeParseJson(window.localStorage.getItem(STORAGE_KEYS.activePlanId), null)
  const plan = safeParseJson(window.localStorage.getItem(STORAGE_KEYS.plan), null)
  const records = safeParseJson(window.localStorage.getItem(STORAGE_KEYS.records), [])

  const payload = {
    version: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    rescuedAfterCrash: true,
    plans: Array.isArray(plans) ? plans : [],
    activePlanId,
    plan,
    records: Array.isArray(records) ? records : [],
  }

  downloadFile(
    buildBackupFilename(new Date(), 'crash-rescue'),
    JSON.stringify(payload, null, 2),
    'application/json;charset=utf-8;',
  )

  return payload
}
