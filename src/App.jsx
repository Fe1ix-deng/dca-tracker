import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import Layout from './components/Layout'
import { getPeriodicAmount, getSuggestedShares as getDcaSuggestedShares } from './utils/dcaCalc'
import { calcAllTargets, getRequiredInvestment, getSuggestedShares as getVaSuggestedShares, getTrackedShares } from './utils/vaCalc'
import { usePlan } from './hooks/usePlan'
import { useRecords } from './hooks/useRecords'
import useTheme from './hooks/useTheme'
import { clearAll, getBackupStatus, markBackedUp, markDataChanged } from './utils/storage'
import { getBudgetLimitedShares, getRemainingDeployableBudget } from './utils/budget'
import { downloadBackupJson } from './utils/backup'
import { roundPrice } from './utils/marketPrecision'
import { adjustAssetForSplit, adjustHoldingForSplit, getSplitFactor, getSplitFactorBetween, normalizeSplitEvents } from './utils/stockSplits'

const Dashboard = lazy(() => import('./components/Dashboard'))
const History = lazy(() => import('./components/History'))
const OperationPanel = lazy(() => import('./components/OperationPanel'))
const Settings = lazy(() => import('./components/Settings'))

const tabs = {
  dashboard: Dashboard,
  operation: OperationPanel,
  history: History,
  settings: Settings,
}

function ScreenFallback() {
  return (
    <section className="card p-6">
      <p className="label">页面加载中</p>
      <p className="body-copy mt-3">正在准备当前页面内容，请稍候。</p>
    </section>
  )
}

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

function normalizeRecordAssets(record, marketOrPlan) {
  const assets = Array.isArray(record?.assets) ? record.assets : []
  const nextAssets = assets.map((asset) => {
    const price = roundPrice(Number(asset.price) || 0, marketOrPlan)
    const actualShares = Number(asset.actualShares) || 0
    return {
      ...asset,
      price,
      actualShares,
      actualAmount: roundToTwo(actualShares * price),
    }
  })

  return {
    ...record,
    assets: nextAssets,
    totalActualAmount: roundToTwo(nextAssets.reduce((sum, asset) => sum + (Number(asset.actualAmount) || 0), 0)),
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
        const ticker = asset.ticker
        if (!ticker) return
        sharesMap.set(ticker, roundToTwo((sharesMap.get(ticker) || 0) + (Number(asset.actualShares) || 0)))
      })
    })

  return sharesMap
}

function getInitialSharesMap(plan, sourceRecords) {
  const recordedSharesMap = getRecordedSharesMap(sourceRecords, plan.id)

  return new Map(plan.assets.map((asset) => {
    const currentShares = Number(asset.currentShares) || 0
    const recordedShares = Number(recordedSharesMap.get(asset.ticker)) || 0
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

    return [asset.ticker, roundToTwo(initialShares)]
  }))
}

export function rebuildPlanState(plan, records, sourceRecords = records) {
  if (!plan) {
    return {
      nextPlan: null,
      nextRecords: Array.isArray(records) ? records : [],
    }
  }

  const targetMatrix = calcAllTargets(plan)
  const splitEvents = normalizeSplitEvents(plan.splitEvents)
  const asOfDate = new Date().toISOString().slice(0, 10)
  const planBasisDate = String(plan.createdAt || '').slice(0, 10) || '1900-01-01'
  const planRecords = (Array.isArray(records) ? records : [])
    .filter((record) => record.planId === plan.id)
    .slice()
    .sort((left, right) => left.periodIndex - right.periodIndex)

  const otherRecords = (Array.isArray(records) ? records : []).filter((record) => record.planId !== plan.id)
  const initialSharesMap = getInitialSharesMap(plan, sourceRecords)
  const initialAverageCostMap = new Map(plan.assets.map((asset) => {
    const factor = getSplitFactor(asset.ticker, planBasisDate, splitEvents, asOfDate)
    const originalCost = asset.initialAverageCostOriginal !== undefined
      ? Number(asset.initialAverageCostOriginal) || 0
      : Number(asset.initialAverageCost) || 0
    return [asset.ticker, adjustHoldingForSplit(initialSharesMap.get(asset.ticker) || 0, originalCost, factor)]
  }))
  const assetSharesMap = new Map(plan.assets.map((asset) => [asset.ticker, initialSharesMap.get(asset.ticker) || 0]))
  let holdingBasisDate = String(plan.createdAt || planRecords[0]?.date || '').slice(0, 10) || '1900-01-01'
  let cumulativeInvested = 0

  const rebuiltPlanRecords = planRecords.map((record, index) => {
    const normalizedRecord = normalizeRecordAssets(record, plan)
    const recordDate = String(record.date || '').slice(0, 10)

    plan.assets.forEach((planAsset) => {
      const ticker = planAsset.ticker
      const factorToRecord = getSplitFactorBetween(ticker, holdingBasisDate, recordDate, splitEvents)
      assetSharesMap.set(ticker, roundToTwo((Number(assetSharesMap.get(ticker)) || 0) * factorToRecord))
    })
    holdingBasisDate = recordDate || holdingBasisDate

    let suggestedBudgetReserved = 0
    const nextAssets = normalizedRecord.assets.map((asset) => {
      const planAssetIndex = plan.assets.findIndex((item) => item.ticker === asset.ticker)
      const planAsset = plan.assets[planAssetIndex]
      const previousShares = Number(assetSharesMap.get(asset.ticker)) || 0
      const price = roundPrice(asset.price, plan)
      const initialShares = Number(initialSharesMap.get(asset.ticker)) || 0
      const initialSharesAtRecord = roundToTwo(
        initialShares * getSplitFactorBetween(asset.ticker, planBasisDate, recordDate, splitEvents),
      )
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
      const actualAmount = roundToTwo(actualShares * price)
      const splitFactor = getSplitFactor(asset.ticker, recordDate, splitEvents, asOfDate)
      const adjustedAsset = adjustAssetForSplit({ ...asset, actualAmount }, splitFactor)
      const adjustedPrice = roundPrice(adjustedAsset.adjustedPrice, plan)
      const nextShares = roundToTwo(previousShares + actualShares)

      assetSharesMap.set(asset.ticker, nextShares)

      return {
        ...asset,
        price,
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
        adjustedActualAmount: roundToTwo(adjustedAsset.adjustedShares * adjustedPrice),
        splitFactor,
      }
    })

    const totalActualAmount = roundToTwo(nextAssets.reduce((sum, asset) => sum + (Number(asset.actualAmount) || 0), 0))
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
      initialSharesOriginal: roundToTwo(initialSharesMap.get(asset.ticker) || 0),
      initialShares: roundToTwo(initialAverageCostMap.get(asset.ticker)?.shares || 0),
      initialAverageCostOriginal: Number(asset.initialAverageCostOriginal ?? asset.initialAverageCost) || 0,
      initialAverageCost: roundToTwo(initialAverageCostMap.get(asset.ticker)?.averageCost || 0),
      currentShares: roundToTwo((Number(assetSharesMap.get(asset.ticker)) || 0) * getSplitFactorBetween(asset.ticker, holdingBasisDate, asOfDate, splitEvents)),
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

export function stateNeedsRebuild(plan, records) {
  const { nextPlan, nextRecords } = rebuildPlanState(plan, records)
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
  const { plan, plans, activePlanId, setActivePlan, replacePlan, replacePlans, resetPlan } = usePlan()
  const { records, addRecord, replaceRecords } = useRecords()
  const { accent, setAccent, theme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [backupPing, setBackupPing] = useState(0)

  const Screen = useMemo(() => tabs[activeTab], [activeTab])
  // backupPing forces a refresh after an export, since exporting doesn't
  // otherwise change `plan` or `records` and would leave a stale reminder.
  const backupStatus = useMemo(() => getBackupStatus(), [plan, records, backupPing])

  useEffect(() => {
    if (!plan || !stateNeedsRebuild(plan, records)) {
      return
    }

    const { nextPlan, nextRecords } = rebuildPlanState(plan, records)
    replaceRecords(nextRecords)
    replacePlan(nextPlan)
  }, [plan, records, replacePlan, replaceRecords])

  const handleSavePlan = (nextPlan) => {
    const { nextPlan: rebuiltPlan, nextRecords } = rebuildPlanState(nextPlan, records)
    replaceRecords(nextRecords)
    replacePlan(rebuiltPlan)
    markDataChanged()
    setActiveTab('dashboard')
  }

  const handleSaveRecord = (record, nextPlan) => {
    addRecord(record)
    replacePlan(nextPlan)
    markDataChanged()
    setActiveTab('history')
  }

  const handleDeleteRecord = (recordId) => {
    const { nextPlan, nextRecords } = rebuildStateAfterRecordDeletion(plan, records, recordId)
    replaceRecords(nextRecords)
    replacePlan(nextPlan)
    markDataChanged()
    setActiveTab('history')
  }

  const handleEditRecord = (updatedRecord) => {
    const { nextPlan, nextRecords } = rebuildStateAfterRecordEdit(plan, records, updatedRecord)
    replaceRecords(nextRecords)
    replacePlan(nextPlan)
    markDataChanged()
    setActiveTab('history')
  }

  const handleImportBackup = (payload) => {
    // Import overwrites everything below, so first protect whatever is
    // currently stored: auto-export it as a labeled safety snapshot the user
    // can re-import if the incoming file turns out to be wrong or corrupt.
    const hasExistingData = plans.length > 0 || records.length > 0
    if (hasExistingData) {
      downloadBackupJson(plan, plans, records, { label: 'pre-import' })
    } else {
      markBackedUp()
    }

    const nextPlans = Array.isArray(payload?.plans)
      ? payload.plans
      : payload?.plan
        ? [payload.plan]
        : []
    const nextActivePlanId = payload?.activePlanId || nextPlans[0]?.id || null
    const nextRecords = Array.isArray(payload?.records) ? payload.records : []

    replaceRecords(nextRecords)
    replacePlans(nextPlans, nextActivePlanId)
    setActiveTab(nextPlans.length ? 'history' : 'settings')
  }

  const handleClearAllData = () => {
    clearAll()
    replaceRecords([])
    resetPlan()
    setActiveTab('settings')
  }

  const handleExportBackup = () => {
    downloadBackupJson(plan, plans, records)
    setBackupPing((count) => count + 1)
  }

  return (
    <Layout
      activeTab={activeTab}
      onChangeTab={setActiveTab}
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
      <Suspense fallback={<ScreenFallback />}>
        <Screen
          plan={plan}
          plans={plans}
          records={records}
          onSavePlan={handleSavePlan}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
          onEditRecord={handleEditRecord}
          onImportBackup={handleImportBackup}
          onClearAllData={handleClearAllData}
          onExportBackup={handleExportBackup}
          onNavigate={setActiveTab}
        />
      </Suspense>
    </Layout>
  )
}
