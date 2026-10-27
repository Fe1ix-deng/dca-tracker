import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Layout from './components/Layout'
import { getPeriodicAmount, getSuggestedShares as getDcaSuggestedShares } from './utils/dcaCalc'
import { calcAllTargets, getRequiredInvestment, getSuggestedShares as getVaSuggestedShares, getTrackedShares } from './utils/vaCalc'
import { usePlan } from './hooks/usePlan'
import { useRecords } from './hooks/useRecords'
import useTheme from './hooks/useTheme'
import { clearAll, getBackupStatus, markBackedUp, markDataChanged } from './utils/storage'
import { getBudgetLimitedShares, getRemainingDeployableBudget } from './utils/budget'
import { downloadBackupJson, rescueRawBackup } from './utils/backup'
import { savePlanDraft } from './utils/planSaveCoordinator'
import { persistPlanSave } from './utils/savePlanTransaction'
import { inspectAssetIntegrity } from './utils/assetIntegrity'
import { BACKUP_LIMITS, canonicalTicker, draftNumber } from './utils/planConstraints'
import { validatePlanDraft } from './utils/planValidation'
import { validateAndNormalizeBackup } from './utils/backupSchema'
import { roundPrice } from './utils/marketPrecision'
import { getLocalDate, parseExecutionDate, getCreatedLocalDate } from './utils/executionDate'
import { useLocalDate } from './hooks/useLocalDate'
import { inspectValuationBasis, resolveHolding } from './utils/valuation'
import { adjustAssetForSplit, adjustHoldingForSplit, getSplitFactor, getSplitFactorBetween, normalizeSplitEvents } from './utils/stockSplits'
import { useI18n } from './i18n/index.jsx'
import { getPathForTab, getTabFromPath } from './utils/navigation'

const Dashboard = lazy(() => import('./components/Dashboard'))
const Faq = lazy(() => import('./components/Faq'))
const History = lazy(() => import('./components/History'))
const OperationPanel = lazy(() => import('./components/OperationPanel'))
const Settings = lazy(() => import('./components/Settings'))

const tabs = {
  dashboard: Dashboard,
  faq: Faq,
  operation: OperationPanel,
  history: History,
  settings: Settings,
}

function ScreenFallback() {
  const { t } = useI18n()
  return (
    <section className="card p-6">
      <p className="label">{t('页面加载中')}</p>
      <p className="body-copy mt-3">{t('正在准备当前页面内容，请稍候。')}</p>
    </section>
  )
}

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

function normalizeRecordAssets(record, marketOrPlan) {
  const assets = Array.isArray(record?.assets) ? record.assets : []
  const nextAssets = assets.map((asset) => {
    const price = asset.price
    const actualShares = Number(asset.actualShares) || 0
    return {
      ...asset,
      price,
      actualShares,
      actualAmount: asset.actualAmount ?? roundToTwo(actualShares * price),
    }
  })

  return {
    ...record,
    assets: nextAssets,
    totalActualAmount: record.totalActualAmount ?? roundToTwo(nextAssets.reduce((sum, asset) => sum + (Number(asset.actualAmount) || 0), 0)),
  }
}

function getRecordedSharesMap(records, planId) {
  const sharesMap = new Map()
  const safeRecords = Array.isArray(records) ? records : []

  safeRecords
    .filter((record) => record.planId === planId)
    .forEach((record) => {
      const assets = Array.isArray(record.assets) ? record.assets : []

      assets.forEach((asset) => {
        const ticker = canonicalTicker(asset.ticker)
        if (!ticker) return
        sharesMap.set(ticker, Number(((sharesMap.get(ticker) || 0) + (Number(asset.actualShares) || 0)).toFixed(8)))
      })
    })

  return sharesMap
}

function getInitialSharesMap(plan, sourceRecords) {
  const recordedSharesMap = getRecordedSharesMap(sourceRecords, plan.id)

  return new Map(plan.assets.map((asset) => {
    const currentShares = Number(asset.currentShares) || 0
    const recordedShares = Number(recordedSharesMap.get(canonicalTicker(asset.ticker))) || 0
    const hasOriginalInitialShares = asset.initialSharesOriginal !== undefined && asset.initialSharesOriginal !== null && asset.initialSharesOriginal !== ''
    const hasInitialShares = asset.initialShares !== undefined && asset.initialShares !== null && asset.initialShares !== ''
    const fallbackInitialShares = hasOriginalInitialShares
      ? Number(asset.initialSharesOriginal) || 0
      : hasInitialShares
        ? Number(asset.initialShares) || 0
        : recordedShares > 0
          ? currentShares - recordedShares
          : currentShares
    const initialShares = Math.max(0, fallbackInitialShares)

    return [canonicalTicker(asset.ticker), Number(initialShares.toFixed(8))]
  }))
}

export function rebuildPlanState(plan, records, sourceRecords = records, { asOfDate = getLocalDate() } = {}) {
  if (!plan) {
    return {
      nextPlan: null,
      nextRecords: Array.isArray(records) ? records : [],
    }
  }

  if (plan.assets.some(asset => !inspectValuationBasis(plan, asset.ticker, asOfDate).reliable) || records.some(record => record.planId === plan.id && (!parseExecutionDate(record.date) || parseExecutionDate(record.date) > asOfDate))) return { nextPlan: plan, nextRecords: records }

  const targetMatrix = calcAllTargets(plan)
  const splitEvents = normalizeSplitEvents(plan.splitEvents)
  const planBasisDate = getCreatedLocalDate(plan.createdAt)
  const planRecords = (Array.isArray(records) ? records : [])
    .filter((record) => record.planId === plan.id)
    .slice()
    .sort((left, right) => left.periodIndex - right.periodIndex)

  const otherRecords = (Array.isArray(records) ? records : []).filter((record) => record.planId !== plan.id)
  const initialSharesMap = getInitialSharesMap(plan, sourceRecords)
  const initialAverageCostMap = new Map(plan.assets.map((asset) => {
    const factor = getSplitFactor(asset.ticker, planBasisDate, splitEvents, asOfDate)
    const originalCost = asset.initialAverageCostOriginal !== undefined
      ? roundPrice(asset.initialAverageCostOriginal, plan)
      : roundPrice(asset.initialAverageCost, plan)
    return [canonicalTicker(asset.ticker), adjustHoldingForSplit(initialSharesMap.get(canonicalTicker(asset.ticker)) || 0, originalCost, factor)]
  }))
  if (plan.assets.some(asset => !resolveHolding({ plan, records: sourceRecords, ticker: asset.ticker, asOfDate }).reliable)) return { nextPlan: plan, nextRecords: records }
  const assetSharesMap = new Map(plan.assets.map((asset) => [canonicalTicker(asset.ticker), initialSharesMap.get(canonicalTicker(asset.ticker)) || 0]))
  let holdingBasisDate = planBasisDate || parseExecutionDate(planRecords[0]?.date)
  let cumulativeInvested = 0

  const rebuiltPlanRecords = planRecords.map((record, index) => {
    const normalizedRecord = normalizeRecordAssets(record, plan)
    const recordDate = parseExecutionDate(record.date)

    plan.assets.forEach((planAsset) => {
      const ticker = canonicalTicker(planAsset.ticker)
      const factorToRecord = getSplitFactorBetween(ticker, holdingBasisDate, recordDate, splitEvents)
      assetSharesMap.set(ticker, Number(((Number(assetSharesMap.get(ticker)) || 0) * factorToRecord).toFixed(8)))
    })
    holdingBasisDate = recordDate || holdingBasisDate

    let suggestedBudgetReserved = 0
    const nextAssets = normalizedRecord.assets.map((asset) => {
      const planAssetIndex = plan.assets.findIndex((item) => canonicalTicker(item.ticker) === canonicalTicker(asset.ticker))
      const planAsset = plan.assets[planAssetIndex]
      const previousShares = Number(assetSharesMap.get(canonicalTicker(asset.ticker))) || 0
      const price = roundPrice(asset.price, plan)
      const initialShares = Number(initialSharesMap.get(canonicalTicker(asset.ticker))) || 0
      const initialSharesAtRecord = Number((initialShares * getSplitFactorBetween(asset.ticker, planBasisDate, recordDate, splitEvents)).toFixed(8))
      const trackedShares = plan.strategy === 'VA'
        ? getTrackedShares(previousShares, initialSharesAtRecord)
        : previousShares
      const currentValueBefore = roundToTwo(trackedShares * price)
      const totalCurrentValueBefore = roundToTwo(previousShares * price)
      const targetValue = plan.strategy === 'VA'
        ? roundToTwo(Number(targetMatrix?.[index]?.[planAssetIndex] || 0))
        : roundToTwo(getPeriodicAmount(plan, planAsset?.weight))
      const requiredAmount = plan.strategy === 'VA'
        ? getRequiredInvestment(currentValueBefore, targetValue)
        : roundToTwo(getPeriodicAmount(plan, planAsset?.weight))
      const rawSuggestedShares = plan.strategy === 'VA'
        ? getVaSuggestedShares(requiredAmount, price)
        : getDcaSuggestedShares(requiredAmount, price)
      const suggestedShares = getBudgetLimitedShares(
        rawSuggestedShares,
        price,
        plan,
        cumulativeInvested + suggestedBudgetReserved,
      )
      suggestedBudgetReserved = roundToTwo(suggestedBudgetReserved + suggestedShares * price)
      const actualShares = Number(asset.actualShares) || 0
      const actualAmount = asset.actualAmount ?? roundToTwo(actualShares * price)
      const splitFactor = getSplitFactor(asset.ticker, recordDate, splitEvents, asOfDate)
      const adjustedAsset = adjustAssetForSplit({ ...asset, actualAmount }, splitFactor)
      const adjustedPrice = roundPrice(adjustedAsset.adjustedPrice, plan)
      const adjustedActualAmount = actualAmount
      const nextShares = Number((previousShares + actualShares).toFixed(8))

      assetSharesMap.set(canonicalTicker(asset.ticker), nextShares)

      return {
        ...asset,
        price: asset.price,
        totalCurrentValueBefore,
        trackedShares,
        currentValueBefore,
        targetValue,
        requiredAmount,
        suggestedShares,
        actualShares,
        actualAmount,
        adjustedShares: adjustedAsset.adjustedShares,
        adjustedPrice,
        adjustedActualAmount,
        splitFactor,
      }
    })

    const totalActualAmount = record.totalActualAmount ?? roundToTwo(nextAssets.reduce((sum, asset) => sum + (Number(asset.actualAmount) || 0), 0))
    cumulativeInvested = roundToTwo(cumulativeInvested + totalActualAmount)
    const remainingBudget = Math.max(0, getRemainingDeployableBudget(plan, cumulativeInvested))

    return {
      ...normalizedRecord,
      periodIndex: index,
      assets: nextAssets,
      totalActualAmount,
      cumulativeInvested,
      remainingBudget,
    }
  })

  const nextPlan = {
    ...plan,
    currentPeriod: rebuiltPlanRecords.length,
    assets: plan.assets.map((asset) => ({
      ...asset,
      initialSharesOriginal: Number((initialSharesMap.get(canonicalTicker(asset.ticker)) || 0).toFixed(8)),
      initialShares: initialAverageCostMap.get(canonicalTicker(asset.ticker))?.shares || 0,
      initialAverageCostOriginal: roundPrice(asset.initialAverageCostOriginal ?? asset.initialAverageCost, plan),
      initialAverageCost: roundPrice(initialAverageCostMap.get(canonicalTicker(asset.ticker))?.averageCost || 0, plan),
      currentShares: resolveHolding({ plan: { ...plan, assets: plan.assets.map(a => ({ ...a, initialSharesOriginal: initialSharesMap.get(canonicalTicker(a.ticker)) })) }, records, ticker: asset.ticker, asOfDate }).shares ?? asset.currentShares,
    })),
  }

  const nextRecords = [...otherRecords, ...rebuiltPlanRecords].sort((left, right) => {
    if (left.planId === right.planId) {
      return right.periodIndex - left.periodIndex
    }
    return right.date.localeCompare(left.date)
  })

  return {
    nextPlan,
    nextRecords,
  }
}

export function stateNeedsRebuild(plan, records, options) {
  const { nextPlan, nextRecords } = rebuildPlanState(plan, records, records, options)
  return JSON.stringify(nextPlan) !== JSON.stringify(plan) || JSON.stringify(nextRecords) !== JSON.stringify(records)
}

function rebuildStateAfterRecordDeletion(plan, records, recordId) {
  const remainingRecords = (Array.isArray(records) ? records : []).filter((record) => record.id !== recordId)
  return rebuildPlanState(plan, remainingRecords, records)
}

function rebuildStateAfterRecordEdit(plan, records, updatedRecord) {
  const nextRecords = (Array.isArray(records) ? records : []).map((record) =>
    record.id === updatedRecord.id ? { ...record, ...updatedRecord } : record,
  )
  return rebuildPlanState(plan, nextRecords, records)
}

export default function App() {
  const { t } = useI18n()
  const asOfDate = useLocalDate()
  const { plan, plans, activePlanId, setActivePlan, replacePlan, replacePlans, removePlan, resetPlan, publishPlanState, assetIntegrity: loadedIntegrity, storageError: planStorageError } = usePlan()
  const { records, addRecord, replaceRecords, publishRecords, storageError: recordStorageError } = useRecords()
  const { accent, setAccent, theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState(() => (
    typeof window === 'undefined' ? 'dashboard' : getTabFromPath(window.location.pathname)
  ))
  const [backupPing, setBackupPing] = useState(0)
  const [saveFailure, setSaveFailure] = useState('')
  const [recoveryRequired, setRecoveryRequired] = useState(false)
  const contextRef = useRef(null)
  const saveContextRef = useRef(0)
  const previousContextRef = useRef({ activePlanId, activeTab })
  if (previousContextRef.current.activePlanId !== activePlanId || previousContextRef.current.activeTab !== activeTab) {
    saveContextRef.current += 1
    previousContextRef.current = { activePlanId, activeTab }
  }
  const saveContext = saveContextRef.current
  contextRef.current = { plans, records, activePlanId, activeTab }
  const currentIntegrity = useMemo(() => inspectAssetIntegrity({ plans, records }), [plans, records])
  const planIntegrity = loadedIntegrity?.byPlanId[plan?.id]?.needsRepair
    ? loadedIntegrity.byPlanId[plan.id] : currentIntegrity.byPlanId[plan?.id]
  const needsRepair = Boolean(planIntegrity?.needsRepair)
  const loadedDraftValidation = plan ? validatePlanDraft(plan, { editingPlanId: plan.id, planRecordCount: records.filter(record => record.planId === plan.id).length }) : { isValid: true }
  const invalidInitialHoldings = (Array.isArray(plan?.assets) ? plan.assets : []).some(asset =>
    ['initialSharesOriginal', 'initialShares', 'initialAverageCostOriginal'].some(field => {
      const value = asset?.[field]
      if (value === undefined || value === null || value === '') return false
      const number = draftNumber(value)
      return !Number.isFinite(number) || number < 0
    }),
  )
  const unassignedIssues = currentIntegrity.issues.filter(issue => !currentIntegrity.byPlanId[issue.planId])
  const publishSaved = useCallback(next => {
    publishPlanState({ plans: next.plans, activePlanId: next.activePlanId })
    publishRecords(next.records)
  }, [publishPlanState, publishRecords])

  const Screen = useMemo(() => tabs[activeTab], [activeTab])
  // backupPing forces a refresh after an export, since exporting doesn't
  // otherwise change `plan` or `records` and would leave a stale reminder.
  const backupStatus = useMemo(() => getBackupStatus(), [plan, records, backupPing])

  const navigateTo = useCallback((nextTab) => {
    saveContextRef.current += 1
    const nextPath = getPathForTab(nextTab)
    setActiveTab(nextTab)

    if (window.location.pathname !== nextPath) {
      window.history.pushState({ tab: nextTab }, '', nextPath)
    }

    document.querySelector('.app-scroll-area')?.scrollTo({ top: 0 })
  }, [])

  useEffect(() => {
    const handlePopState = () => setActiveTab(getTabFromPath(window.location.pathname))
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    if (!plan || needsRepair || !loadedDraftValidation.isValid || invalidInitialHoldings || recoveryRequired || saveFailure || !stateNeedsRebuild(plan, records, { asOfDate })) {
      return
    }

    const { nextPlan, nextRecords } = rebuildPlanState(plan, records, records, { asOfDate })
    const next = { plans: plans.map(item => item.id === plan.id ? nextPlan : item), activePlanId, plan: nextPlan, records: nextRecords }
    const result = persistPlanSave({ next })
    if (result.ok) publishSaved(next)
    else { setSaveFailure(result.error); setRecoveryRequired(true) }
  }, [plan, plans, records, activePlanId, needsRepair, invalidInitialHoldings, recoveryRequired, saveFailure, publishSaved, asOfDate])

  const handleSavePlan = async (nextPlan, submission = {}) => {
    const current = contextRef.current
    if (saveContext !== saveContextRef.current || current.activeTab !== 'settings' || current.activePlanId !== activePlanId) {
      return { ok: false, error: '保存上下文已变化，请重新打开计划。' }
    }
    const editingPlanId = Object.prototype.hasOwnProperty.call(submission, 'editingPlanId')
      ? submission.editingPlanId
      : current.plans.some(item => item.id === nextPlan.id) ? nextPlan.id : null
    const result = savePlanDraft({ draft: nextPlan, plans: current.plans, records: current.records, editingPlanId, rebuild: rebuildPlanState, publish: publishSaved, markChanged: markDataChanged })
    if (!result.ok) { setRecoveryRequired(true); setSaveFailure(result.error) }
    else { setRecoveryRequired(false); setSaveFailure('') }
    return result
  }

  const handleSaveRecord = (record, nextPlan) => {
    if (needsRepair || records.length >= BACKUP_LIMITS.maxRecords) {
      setSaveFailure('数据需要修复或已达到 5000 条记录上限，请导出并整理记录。')
      return { ok: false, error: '不能新增记录。' }
    }
    const recordResult = addRecord(record)
    if (recordResult && !recordResult.ok) return
    replacePlan(nextPlan)
    markDataChanged()
    navigateTo('history')
  }

  const handleDeleteRecord = (recordId) => {
    const { nextPlan, nextRecords } = rebuildStateAfterRecordDeletion(plan, records, recordId)
    replaceRecords(nextRecords)
    replacePlan(nextPlan)
    markDataChanged()
    navigateTo('history')
  }

  const handleDeletePlan = (planId) => {
    const targetPlan = plans.find((item) => item.id === planId)
    if (!targetPlan) {
      return
    }

    replaceRecords(records.filter((record) => record.planId !== planId))
    removePlan(planId)
    markDataChanged()
    navigateTo('settings')
  }

  const handleEditRecord = (updatedRecord) => {
    const { nextPlan, nextRecords } = rebuildStateAfterRecordEdit(plan, records, updatedRecord)
    replaceRecords(nextRecords)
    replacePlan(nextPlan)
    markDataChanged()
    navigateTo('history')
  }

  const handleImportBackup = (payload) => {
    try {
      const normalized = validateAndNormalizeBackup(payload)
      const hasExistingData = plans.length > 0 || records.length > 0
      if (hasExistingData) {
        if (currentIntegrity.issues.length) rescueRawBackup()
        else downloadBackupJson(plan, plans, records, { label: 'pre-import' })
      }
      const next = { plans: normalized.plans, activePlanId: normalized.activePlanId, plan: normalized.plans.find(item => item.id === normalized.activePlanId) || null, records: normalized.records }
      const result = persistPlanSave({ next })
      if (!result.ok) { setSaveFailure(result.error); setRecoveryRequired(true); return result }
      publishSaved(next)
      setSaveFailure('')
      setRecoveryRequired(false)
      markDataChanged()
      navigateTo(next.plans.length ? 'history' : 'settings')
      return { ok: true }
    } catch (error) {
      const result = { ok: false, error: error?.message || '导入失败。' }
      setSaveFailure(result.error)
      return result
    }
  }

  const handleClearAllData = () => {
    clearAll()
    replaceRecords([])
    resetPlan()
    navigateTo('settings')
  }

  const handleExportBackup = () => {
    try { downloadBackupJson(plan, plans, records) }
    catch (error) { setSaveFailure(error.message); return }
    setBackupPing((count) => count + 1)
  }

  return (
    <Layout
      activeTab={activeTab}
      onChangeTab={navigateTo}
      plans={plans}
      activePlanId={activePlanId || ''}
      onChangeActivePlan={setActivePlan}
      theme={theme}
      onToggleTheme={toggleTheme}
      accent={accent}
      onChangeAccent={setAccent}
      backupStatus={backupStatus}
      onExportBackup={handleExportBackup}
    >
      {(planStorageError || recordStorageError) ? <div role="alert" className="mx-auto mt-4 max-w-7xl rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">保存失败：{planStorageError || recordStorageError}</div> : null}
      {saveFailure && activeTab !== 'settings' ? <div role="alert" className="card p-4">{saveFailure}</div> : null}
      {invalidInitialHoldings ? <p role="alert" className="card p-4">{t('计划结构无效，请从有效备份恢复。')}</p> : null}
      {unassignedIssues.length ? <section className="card p-4" aria-label="数据需要修复"><h2>数据需要修复</h2><ul>{unassignedIssues.map((issue, index) => <li key={index}>{issue.path} · {issue.planId} · {issue.code}</li>)}</ul><button type="button" className="control-button" onClick={rescueRawBackup}>导出原始恢复 JSON</button><p>保留原始数据，不保证可直接导入。无关健康计划仍可使用。</p></section> : null}
      {needsRepair ? <section className="card p-4" aria-label="数据需要修复"><h2>数据需要修复</h2><p>此计划暂不能保存、新增操作或自动重建。请从校验通过的备份恢复。</p><ul>{planIntegrity.issues.map((issue, index) => <li key={index}>{issue.path} · {issue.ticker} · {issue.code}</li>)}</ul><button type="button" className="control-button" onClick={rescueRawBackup}>导出原始恢复 JSON</button><p>保留原始数据，不保证可直接导入。</p></section> : null}
      {records.length >= BACKUP_LIMITS.maxRecords ? <p className="card p-4">已达到 5000 条记录上限，请先导出并整理记录。已有计划仍可编辑。</p> : null}
      <Suspense fallback={<ScreenFallback />}>
        {needsRepair && activeTab !== 'settings' && activeTab !== 'faq' ? <div className="card p-5">此计划的数据需要修复，暂不执行依赖资产身份的操作。</div> : <Screen
          plan={plan}
          assetIntegrity={planIntegrity}
          persistenceError={saveFailure}
          plans={plans}
          records={records}
          onSavePlan={handleSavePlan}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
          onDeletePlan={handleDeletePlan}
          onEditRecord={handleEditRecord}
          onImportBackup={handleImportBackup}
          onClearAllData={handleClearAllData}
          onExportBackup={handleExportBackup}
          onNavigate={navigateTo}
          asOfDate={asOfDate}
        />}
      </Suspense>
    </Layout>
  )
}
