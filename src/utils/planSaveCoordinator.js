import { validatePlanDraft } from './planValidation'
import { inspectAssetIntegrity, validateAssetIdentityChange } from './assetIntegrity'
import { persistPlanSave } from './savePlanTransaction'
import { BACKUP_LIMITS } from './planConstraints'
export function savePlanDraft({ draft, plans, records, editingPlanId = null, rebuild, publish, markChanged, adapter }) {
  if (records.length > BACKUP_LIMITS.maxRecords) return { ok: false, code: 'recordLimit', error: '记录超过 5000 条，请先导出并整理记录。' }
  const integrity = inspectAssetIntegrity({ plans, records })
  const original = plans.find(p => p.id === editingPlanId)
  if ((editingPlanId && (!original || draft.id !== editingPlanId)) || (!editingPlanId && plans.some(p => p.id === draft.id))) return { ok: false, error: '保存上下文已变化，请重新打开计划。' }
  const validation = validatePlanDraft(draft, { existingPlanIds: plans.map(p => p.id), editingPlanId, planRecordCount: records.filter(r => r.planId === editingPlanId).length, assetIntegrity: integrity.byPlanId[editingPlanId] })
  const errors = [...validation.errors, ...validateAssetIdentityChange(original, draft, records)]
  const candidateIntegrity = inspectAssetIntegrity({ plans: [draft], records: records.filter(r => r.planId === draft.id) })
  if (candidateIntegrity.issues.length) errors.push({ field: 'assets', code: 'needsRepair', params: {} })
  if (errors.length) return { ok: false, code: 'validation', error: '请修正计划错误后重试。', errors }
  const { nextPlan, nextRecords } = rebuild(draft, records)
  const nextPlans = original ? plans.map(p => p.id === editingPlanId ? nextPlan : p) : [nextPlan, ...plans]
  const next = { plans: nextPlans, activePlanId: nextPlan.id, plan: nextPlan, records: nextRecords }
  const result = persistPlanSave({ next }, adapter)
  if (!result.ok) return result
  publish(next)
  markChanged?.()
  return { ok: true }
}
