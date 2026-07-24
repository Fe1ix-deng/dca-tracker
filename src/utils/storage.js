const STORAGE_KEYS = {
  plan: 'dca-tracker:plan',
  plans: 'dca-tracker:plans',
  activePlanId: 'dca-tracker:active-plan-id',
  records: 'dca-tracker:records',
  lastBackupAt: 'dca-tracker:last-backup-at',
  lastDataChangeAt: 'dca-tracker:last-data-change-at',
  lastReadReleaseVersion: 'dca-tracker:last-read-release-version',
}

function canUseStorage() {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return typeof window.localStorage !== 'undefined'
  } catch (error) {
    return false
  }
}

function readStorage(key, fallback) {
  if (!canUseStorage()) {
    return fallback
  }

  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    console.error(`Failed to read storage key: ${key}`, error)
    return fallback
  }
}

function writeStorage(key, value) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to write storage key: ${key}`, error)
  }
}

export function normalizeRecords(records) {
  if (!Array.isArray(records)) {
    return []
  }

  return records
    .filter((record) => record && typeof record === 'object')
    .map((record) => ({
      ...record,
      assets: Array.isArray(record.assets)
        ? record.assets.filter((asset) => asset && typeof asset === 'object')
        : [],
    }))
}

export function savePlan(plan) {
  writeStorage(STORAGE_KEYS.plan, plan)
}

export function loadPlan() {
  return readStorage(STORAGE_KEYS.plan, null)
}

export function savePlans(plans) {
  writeStorage(STORAGE_KEYS.plans, Array.isArray(plans) ? plans : [])
}

export function loadPlans() {
  return readStorage(STORAGE_KEYS.plans, [])
}

export function saveActivePlanId(activePlanId) {
  writeStorage(STORAGE_KEYS.activePlanId, activePlanId || null)
}

export function loadActivePlanId() {
  return readStorage(STORAGE_KEYS.activePlanId, null)
}

export function saveRecords(records) {
  writeStorage(STORAGE_KEYS.records, normalizeRecords(records))
}

export function loadRecords() {
  return normalizeRecords(readStorage(STORAGE_KEYS.records, []))
}

export function saveLastBackupAt(timestamp) {
  writeStorage(STORAGE_KEYS.lastBackupAt, timestamp)
}

export function loadLastBackupAt() {
  return readStorage(STORAGE_KEYS.lastBackupAt, null)
}

export function saveLastDataChangeAt(timestamp) {
  writeStorage(STORAGE_KEYS.lastDataChangeAt, timestamp)
}

export function loadLastDataChangeAt() {
  return readStorage(STORAGE_KEYS.lastDataChangeAt, null)
}

export function saveLastReadReleaseVersion(version) {
  writeStorage(STORAGE_KEYS.lastReadReleaseVersion, version || null)
}

export function loadLastReadReleaseVersion() {
  return readStorage(STORAGE_KEYS.lastReadReleaseVersion, null)
}

// Call whenever the user completes a full JSON backup export or import.
export function markBackedUp() {
  saveLastBackupAt(new Date().toISOString())
}

// Call whenever a plan or record is created, edited, or deleted.
export function markDataChanged() {
  saveLastDataChangeAt(new Date().toISOString())
}

// Pure comparison, kept separate from storage reads so it can be unit
// tested without a DOM/localStorage environment.
export function computeHasUnbackedChanges(lastBackupAt, lastDataChangeAt) {
  if (!lastDataChangeAt) return false
  return !lastBackupAt || lastBackupAt < lastDataChangeAt
}

export function getBackupStatus() {
  const lastBackupAt = loadLastBackupAt()
  const lastDataChangeAt = loadLastDataChangeAt()

  return {
    lastBackupAt,
    lastDataChangeAt,
    hasUnbackedChanges: computeHasUnbackedChanges(lastBackupAt, lastDataChangeAt),
  }
}

export function clearAll() {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEYS.plan)
    window.localStorage.removeItem(STORAGE_KEYS.plans)
    window.localStorage.removeItem(STORAGE_KEYS.activePlanId)
    window.localStorage.removeItem(STORAGE_KEYS.records)
    window.localStorage.removeItem(STORAGE_KEYS.lastBackupAt)
    window.localStorage.removeItem(STORAGE_KEYS.lastDataChangeAt)
    window.localStorage.removeItem(STORAGE_KEYS.lastReadReleaseVersion)
  } catch (error) {
    console.error('Failed to clear storage', error)
  }
}

export { STORAGE_KEYS, readStorage, writeStorage }
