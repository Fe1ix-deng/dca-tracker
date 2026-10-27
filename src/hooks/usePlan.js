import { useCallback, useMemo, useRef, useState } from 'react'
import { loadActivePlanId, loadPlan, loadPlans, loadRecords } from '../utils/storage'
import { persistPlanSave } from '../utils/savePlanTransaction'
import { inspectAssetIntegrity } from '../utils/assetIntegrity'
import { normalizeMarket, roundPrice } from '../utils/marketPrecision'

const defaultPlan = null
import { OPEN_ENDED_PLACEHOLDER_PERIODS, draftNumber } from '../utils/planConstraints'

function createEmptyPlan() {
  return {
    id: '',
    name: '',
    strategy: 'VA',
    market: 'US',
    budgetMode: 'fixed',
    totalBudget: 10000,
    reserveRatio: 0.2,
    totalPeriods: 24,
    periodicTarget: 1000,
    currentPeriod: 0,
    frequency: 'monthly',
    targetAnnualReturn: 0,
    assets: [],
    splitEvents: [],
    createdAt: '',
  }
}

function normalizePlan(plan) {
  if (!plan) return null

  const budgetMode = plan.budgetMode === 'open-ended' ? 'open-ended' : 'fixed'
  const market = normalizeMarket(plan.market)

  return {
    ...createEmptyPlan(),
    ...plan,
    assets: Array.isArray(plan.assets)
      ? plan.assets
        .filter((asset) => asset && typeof asset === 'object')
        .map((asset) => ({
          ...asset,
          ...(Object.prototype.hasOwnProperty.call(asset, 'initialAverageCost')
            ? { initialAverageCost: Number.isFinite(draftNumber(asset.initialAverageCost)) && draftNumber(asset.initialAverageCost) >= 0 ? roundPrice(asset.initialAverageCost, market) : asset.initialAverageCost }
            : {}),
          ...(Object.prototype.hasOwnProperty.call(asset, 'initialAverageCostOriginal')
            ? { initialAverageCostOriginal: Number.isFinite(draftNumber(asset.initialAverageCostOriginal)) && draftNumber(asset.initialAverageCostOriginal) >= 0 ? roundPrice(asset.initialAverageCostOriginal, market) : asset.initialAverageCostOriginal }
            : {}),
        }))
      : [],
    splitEvents: plan.splitEvents ?? [],
    market: plan.market ?? 'US',
    budgetMode: plan.budgetMode ?? 'fixed',
    reserveRatio: plan.reserveRatio ?? 0.2,
    periodicTarget: plan.periodicTarget ?? 0,
    currentPeriod: plan.currentPeriod ?? 0,
    totalPeriods: plan.totalPeriods ?? (budgetMode === 'open-ended' ? OPEN_ENDED_PLACEHOLDER_PERIODS : 1),
  }
}

export function normalizePlanState(nextPlans, requestedActivePlanId = null) {
  const normalizedById = new Map()

  ;(Array.isArray(nextPlans) ? nextPlans : []).forEach((item) => {
    const normalizedPlan = normalizePlan(item)
    if (!normalizedPlan?.id) {
      return
    }

    normalizedById.set(normalizedPlan.id, normalizedPlan)
  })

  const plans = Array.from(normalizedById.values())
  const activePlanId = plans.some((item) => item.id === requestedActivePlanId)
    ? requestedActivePlanId
    : plans[0]?.id || null

  return {
    plans,
    activePlanId,
  }
}

export function removePlanState(current, planId) {
  const targetPlanId = String(planId || '')
  const targetIndex = current.plans.findIndex((item) => String(item.id) === targetPlanId)
  if (!targetPlanId || targetIndex === -1) {
    return current
  }

  const plans = current.plans.filter((item) => String(item.id) !== targetPlanId)
  const removingActivePlan = String(current.activePlanId) === targetPlanId
  const activePlanId = removingActivePlan
    ? plans[0]?.id || null
    : plans.some((item) => String(item.id) === String(current.activePlanId))
      ? current.activePlanId
      : plans[0]?.id || null

  return {
    plans,
    activePlanId,
  }
}

function loadPlanState() {
  const rawPlans = loadPlans()
  const legacy = loadPlan()
  const source = Array.isArray(rawPlans) && rawPlans.length ? rawPlans : legacy ? [legacy] : []
  const loadedIntegrity = inspectAssetIntegrity({ plans: source, records: loadRecords() })
  const plans = source.map(item => loadedIntegrity.byPlanId[item?.id]?.needsRepair ? item : normalizePlan(item)).filter(Boolean)
  return { plans, activePlanId: loadActivePlanId() || plans[0]?.id || null, loadedIntegrity }
}

function persistPlanState(plans, activePlanId) {
  return persistPlanSave({ next: { plans, activePlanId, plan: plans.find(p => p.id === activePlanId) || null, records: loadRecords() } })
}

export function usePlan() {
  const [state, setState] = useState(() => loadPlanState())
  const [storageError, setStorageError] = useState('')

  const plans = state.plans
  const activePlanId = state.activePlanId
  const plan = plans.find((item) => item.id === activePlanId) || plans[0] || null

  const stateRef = useRef(state)
  stateRef.current = state
  const publishPlanState = useCallback(nextState => {
    stateRef.current = nextState
    setState(nextState)
    setStorageError('')
  }, [])
  const persistAndPublish = useCallback(nextState => {
    const result = persistPlanState(nextState.plans, nextState.activePlanId)
    setStorageError(result.ok ? '' : result.error)
    if (result.ok) publishPlanState(nextState)
    return result
  }, [publishPlanState])
  const replacePlan = useCallback(nextPlan => {
    const current = stateRef.current
    const normalized = normalizePlan(nextPlan)
    if (!normalized) return { ok: false, error: '计划无效。' }
    const nextPlans = current.plans.some(p => p.id === normalized.id)
      ? current.plans.map(p => p.id === normalized.id ? normalized : p)
      : [normalized, ...current.plans]
    return persistAndPublish({ plans: nextPlans, activePlanId: normalized.id })
  }, [persistAndPublish])
  const replacePlans = useCallback((nextPlans, nextActivePlanId = null) =>
    persistAndPublish(normalizePlanState(nextPlans, nextActivePlanId)), [persistAndPublish])
  const removePlan = useCallback(planId => {
    const current = stateRef.current, next = removePlanState(current, planId)
    return next === current ? { ok: true } : persistAndPublish(next)
  }, [persistAndPublish])
  const setActivePlan = useCallback(nextActivePlanId => {
    const current = stateRef.current
    const id = current.plans.some(p => p.id === nextActivePlanId) ? nextActivePlanId : current.plans[0]?.id || null
    return persistAndPublish({ ...current, activePlanId: id })
  }, [persistAndPublish])
  const resetPlan = useCallback(() => publishPlanState({ plans: [], activePlanId: null }), [publishPlanState])
  const assetIntegrity = useMemo(() => state.loadedIntegrity || inspectAssetIntegrity({ plans: state.plans, records: loadRecords() }), [state])

  return useMemo(
    () => ({
      plan,
      plans,
      assetIntegrity,
      publishPlanState,
      activePlanId,
      setActivePlan,
      replacePlan,
      replacePlans,
      removePlan,
      resetPlan,
      storageError,
      defaultPlan,
      createEmptyPlan,
    }),
    [plan, plans, activePlanId, storageError, assetIntegrity, publishPlanState, setActivePlan, replacePlan, replacePlans, removePlan, resetPlan],
  )
}
