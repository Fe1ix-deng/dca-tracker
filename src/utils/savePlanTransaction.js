import { STORAGE_KEYS } from './storage'
import { BACKUP_LIMITS } from './planConstraints'

// Raw strings preserve missing keys and the exact pre-save representation.
export const browserStorageAdapter = {
  read: key => window.localStorage.getItem(key),
  write: (key, value) => window.localStorage.setItem(key, value),
  remove: key => window.localStorage.removeItem(key),
}
function requireSuccess(result) {
  if (result === false || result?.ok === false) throw new Error(result?.error || '本地写入失败。')
}
export function persistPlanSave({ next }, adapter = browserStorageAdapter) {
  if (!Array.isArray(next.records) || next.records.length > BACKUP_LIMITS.maxRecords) return { ok: false, code: 'recordLimit', error: '记录超过 5000 条，请先导出并整理记录。' }
  const entries = [
    [STORAGE_KEYS.plans, next.plans],
    [STORAGE_KEYS.activePlanId, next.activePlanId],
    [STORAGE_KEYS.plan, next.plan],
    [STORAGE_KEYS.records, next.records],
  ]
  const snapshots = new Map(), written = []
  try {
    for (const [key] of entries) snapshots.set(key, adapter.read(key))
    // Serialize everything before the first mutation.
    const serialized = entries.map(([key, value]) => [key, JSON.stringify(value)])
    for (const [key, value] of serialized) {
      requireSuccess(adapter.write(key, value))
      written.push(key)
    }
    return { ok: true }
  } catch (error) {
    let rollbackFailed = false
    for (const key of written.reverse()) {
      try {
        const previous = snapshots.get(key)
        requireSuccess(previous === null ? adapter.remove(key) : adapter.write(key, previous))
      } catch { rollbackFailed = true }
    }
    return { ok: false, code: 'storage', rollbackFailed, error: rollbackFailed
      ? `保存失败：${error?.message || '本地存储不可用'}。部分数据可能已写入，请重试或导出备份。`
      : `保存失败：${error?.message || '本地存储不可用'}。草稿已保留，请重试。` }
  }
}
