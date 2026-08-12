import { useMemo, useState } from 'react'
import { loadActivePlanId, loadPlan, loadPlans, saveActivePlanId, savePlan, savePlans } from '../utils/storage'
import { normalizeSplitEvents } from '../utils/stockSplits'

const defaultPlan = null
const OPEN_ENDED_PLACEHOLDER_PERIODS = 9999
const MAX_RESERVE_RATIO = 0.3

function clampReserveRatio(value) {
  return Math.min(MAX_RESERVE_RATIO, Math.max(0, Number(value) || 0))
}

function createEmptyPlan() {
  return {
    id: '',
    name: '',
    strategy: 'VA',
    budgetMode: 'fixed',
    totalBudget: 10000,
    reserveRatio: 0.2,
    totalPeriods: 24,
    periodicTarget: 1000,
    currentPeriod: 0,
    frequency: 'monthly',
    targetAnnualReturn: 0.25,
    assets: [],
    splitEvents: [],
    createdAt: '',
  }
}

function normalizePlan(plan) {
  if (!plan) return null

  const budgetMode = plan.budgetMode === 'open-ended' ? 'open-ended' : 'fixed'

  return {
    ...createEmptyPlan(),
    ...plan,
    assets: Array.isArray(plan.assets)
      ? plan.assets.filter((asset) => asset && typeof asset === 'object')
      : [],
    splitEvents: normalizeSplitEvents(plan.splitEvents),
    budgetMode,
    reserveRatio: budgetMode === 'open-ended' ? 0 : clampReserveRatio(plan.reserveRatio),
    periodicTarget: Number(plan.periodicTarget) || 0,
    totalPeriods: budgetMode === 'open-ended'
      ? Math.max(Number(plan.totalPeriods) || OPEN_ENDED_PLACEHOLDER_PERIODS, OPEN_ENDED_PLACEHOLDER_PERIODS)
      : Math.max(1, Number(plan.totalPeriods) || 1),
  }
}

function loadPlanState() {
  const storedPlans = loadPlans().map(normalizePlan).filter(Boolean)
  const storedLegacyPlan = normalizePlan(loadPlan())
  const mergedPlans = storedPlans.length
    ? storedPlans
    : storedLegacyPlan
      ? [storedLegacyPlan]
      : []

  const activePlanId = loadActivePlanId() || mergedPlans[0]?.id || null

  if (!storedPlans.length && storedLegacyPlan) {
    savePlans(mergedPlans)
    saveActivePlanId(activePlanId)
  }

  return {
    plans: mergedPlans,
    activePlanId,
  }
}

function persistPlanState(plans, activePlanId) {
  savePlans(plans)
  saveActivePlanId(activePlanId)
  const activePlan = plans.find((plan) => plan.id === activePlanId) || null
  savePlan(activePlan)
}

export function usePlan() {
  const [state, setState] = useState(() => loadPlanState())

  const plans = state.plans
  const activePlanId = state.activePlanId
  const plan = plans.find((item) => item.id === activePlanId) || plans[0] || null

  const replacePlan = (nextPlan) => {
    const normalizedPlan = normalizePlan(nextPlan)
    setState((current) => {
      const nextPlans = normalizedPlan
        ? current.plans.some((item) => item.id === normalizedPlan.id)
          ? current.plans.map((item) => (item.id === normalizedPlan.id ? normalizedPlan : item))
          : [normalizedPlan, ...current.plans]
        : current.plans

      const nextActivePlanId = normalizedPlan?.id || current.activePlanId || null
      persistPlanState(nextPlans, nextActivePlanId)

      return {
        plans: nextPlans,
        activePlanId: nextActivePlanId,
      }
    })
  }

  const setActivePlan = (nextActivePlanId) => {
    setState((current) => {
      const safeActivePlanId = current.plans.some((item) => item.id === nextActivePlanId)
        ? nextActivePlanId
        : current.plans[0]?.id || null
      persistPlanState(current.plans, safeActivePlanId)
      return {
        ...current,
        activePlanId: safeActivePlanId,
      }
    })
  }

  const resetPlan = () => {
    setState({
      plans: [],
      activePlanId: null,
    })
  }

  return useMemo(
    () => ({
      plan,
      plans,
      activePlanId,
      setActivePlan,
      replacePlan,
      resetPlan,
      defaultPlan,
      createEmptyPlan,
    }),
    [plan, plans, activePlanId],
  )
}
