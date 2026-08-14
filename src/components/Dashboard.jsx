import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, RefreshCcw } from 'lucide-react'
import { getDeployableBudget, getRemainingDeployableBudget } from '../utils/budget'
import { fetchMarketQuotes } from '../services/marketQuotes'
import { getLastRecordedPrices, getQuoteDisplayState, resolveMarketPrices } from '../utils/marketSnapshot'
import { formatScheduleDate, getNextContributionDate } from '../utils/contributionSchedule'
import { calculatePortfolioCostBasis } from '../utils/portfolioCost'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatPercent(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '--'
  }
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}%`
}

function formatSignedMoney(value) {
  const numeric = Number(value) || 0
  const formatted = formatMoney(Math.abs(numeric))
  return `${numeric >= 0 ? '+' : '-'}${formatted}`
}

function getProfitLabel(value) {
  return (Number(value) || 0) >= 0 ? '盈利' : '亏损'
}

function getProgressToneClass(ratio) {
  if (ratio < 0.55) return 'bg-accent'
  if (ratio < 0.85) return 'bg-warning'
  return 'bg-negative'
}

function getGapToneClass(value) {
  if (value >= 0.75) return 'text-accent'
  if (value <= -0.75) return 'text-warning'
  return 'text-textSoft'
}

function MetricCard({ label, value, detail, tone = 'text-white' }) {
  return (
    <article className="subtle-panel dashboard-metric-card p-5">
      <div className="min-w-0">
        <p className="mini-kicker">{label}</p>
        <p className={`mt-4 data-value dashboard-tile-value ${tone}`}>{value}</p>
        {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
      </div>
    </article>
  )
}

export default function Dashboard({ plan, records, onNavigate }) {
  const [quoteSnapshot, setQuoteSnapshot] = useState({
    quotes: {},
    asOf: '',
    error: '',
    loading: false,
  })
  const quoteKey = useMemo(
    () => (plan?.assets || []).map((asset) => asset.ticker).filter(Boolean).join(','),
    [plan],
  )

  const refreshMarketQuotes = useCallback(async (clearExisting = false) => {
    const symbols = quoteKey ? quoteKey.split(',') : []
    if (!symbols.length) {
      return
    }

    setQuoteSnapshot((current) => ({
      quotes: clearExisting ? {} : current.quotes,
      asOf: clearExisting ? '' : current.asOf,
      error: '',
      loading: true,
    }))

    const result = await fetchMarketQuotes(symbols)
    setQuoteSnapshot((current) => {
      const previousQuotes = clearExisting ? {} : current.quotes
      const hasFreshQuotes = Object.keys(result.quotes).length > 0

      return {
        quotes: hasFreshQuotes ? { ...previousQuotes, ...result.quotes } : previousQuotes,
        asOf: result.asOf || current.asOf,
        error: result.error,
        loading: false,
      }
    })
  }, [quoteKey])

  useEffect(() => {
    refreshMarketQuotes(true)
  }, [refreshMarketQuotes])

  if (!plan) {
    return (
      <section className="empty-state text-textSoft">
        <p className="label">Overview</p>
        <h2 className="empty-state-title">还没有计划</h2>
        <p className="body-copy mx-auto mt-3 max-w-xl">先去设置页创建你的第一份定投计划，总览页会在这里呈现资产表现和预算状态。</p>
        <button type="button" onClick={() => onNavigate('settings')} className="control-button-primary mt-6">
          去设置计划
        </button>
      </section>
    )
  }

  const isOpenEnded = plan.budgetMode === 'open-ended'
  const planRecords = records
    .filter((record) => record.planId === plan.id)
    .slice()
    .sort((left, right) => left.periodIndex - right.periodIndex)

  if (!planRecords.length) {
    return (
      <section className="empty-state">
        <p className="label">Overview</p>
        <h2 className="empty-state-title">还没有操作记录</h2>
        <p className="body-copy mx-auto mt-3 max-w-2xl">
          创建好计划后，前往“本期操作”录入第一期价格与买入股数，总览页会在这里呈现趋势、仓位和预算检查。
        </p>
        <button
          type="button"
          onClick={() => onNavigate('operation')}
          className="control-button-primary mt-6"
        >
          去完成第一期定投
        </button>
      </section>
    )
  }

  const latestRecord = planRecords[planRecords.length - 1]
  const strategyLabel = plan.strategy === 'VA' ? 'VA 定投' : 'DCA 定投'
  const frequencyLabel = plan.frequency === 'biweekly' ? '双周' : '每月'
  const latestPeriodAmount = Number(latestRecord.totalActualAmount) || 0
  const recordedPriceMap = getLastRecordedPrices(planRecords)
  const marketPriceMap = resolveMarketPrices(plan.assets, recordedPriceMap, quoteSnapshot.quotes)
  const latestPriceMap = Object.fromEntries(Object.entries(marketPriceMap).map(([ticker, quote]) => [ticker, quote.price]))
  const quoteDisplayState = getQuoteDisplayState({
    loading: quoteSnapshot.loading,
    error: quoteSnapshot.error,
    asOf: quoteSnapshot.asOf,
    quoteCount: Object.keys(quoteSnapshot.quotes).length,
  })
  const marketValue = plan.assets.reduce(
    (sum, asset) => sum + (Number(asset.currentShares) || 0) * (latestPriceMap[asset.ticker] || 0),
    0,
  )
  const { costBasis, hasKnownCost } = calculatePortfolioCostBasis(plan.assets, planRecords)
  const floatingProfit = hasKnownCost ? marketValue - costBasis : null
  const floatingProfitPct = hasKnownCost && costBasis > 0 ? (floatingProfit / costBasis) * 100 : null
  const totalInvested = Number(latestRecord.cumulativeInvested) || 0
  const totalBudget = Number(plan.totalBudget) || 0
  const deployableBudget = getDeployableBudget(plan)
  const remainingBudget = Math.max(0, getRemainingDeployableBudget(plan, totalInvested))
  const reserveFloor = Math.max(0, totalBudget - deployableBudget)
  const progressRatio = deployableBudget > 0 ? Math.min(totalInvested / deployableBudget, 1) : 0
  const totalPeriods = Math.max(1, Number(plan.totalPeriods) || 1)
  const completedPeriods = planRecords.length
  const nextPeriodNumber = completedPeriods + 1
  const latestExecutionDate = latestRecord?.date || ''
  const nextContributionDate = formatScheduleDate(getNextContributionDate({
    createdAt: plan.createdAt,
    latestExecutionDate,
    frequency: plan.frequency,
    completedPeriods,
  }))
  const expectedProgressRatio = !isOpenEnded ? Math.min(completedPeriods / totalPeriods, 1) : 0
  let consecutivePeriods = 0
  for (let index = planRecords.length - 1; index >= 0; index -= 1) {
    const record = planRecords[index]
    const newerRecord = planRecords[index + 1]

    if (record.tag === 'paused') break
    if (newerRecord && newerRecord.periodIndex - record.periodIndex !== 1) break

    consecutivePeriods += 1
  }

  const currentWeightData = plan.assets.map((asset) => {
    const price = latestPriceMap[asset.ticker] || 0
    const value = (Number(asset.currentShares) || 0) * price
    const actualWeight = marketValue > 0 ? Number(((value / marketValue) * 100).toFixed(2)) : 0
    const targetWeight = Number(((Number(asset.weight) || 0) * 100).toFixed(2))

    return {
      name: asset.ticker,
      actualWeight,
      targetWeight,
      value,
      weightGap: Number((actualWeight - targetWeight).toFixed(2)),
    }
  })

  const largestWeightGap = currentWeightData.reduce(
    (largest, asset) => Math.max(largest, Math.abs(asset.weightGap)),
    0,
  )
  const allocationHealthText = largestWeightGap > 5
    ? `最大偏离 ${largestWeightGap.toFixed(2)}%，建议复核。`
    : '没有超过 ±5% 的显著偏离。'

  const metrics = [
    {
      label: '当前总市值',
      value: formatMoney(marketValue),
      detail: `覆盖 ${plan.assets.length} 个标的。`,
      tone: 'text-white',
    },
    {
      label: '浮动盈亏',
      value: hasKnownCost ? formatSignedMoney(floatingProfit) : '--',
      detail: hasKnownCost ? `${getProfitLabel(floatingProfit)} ${formatPercent(floatingProfitPct)}。` : '请补充已有持仓成本。',
      tone: hasKnownCost ? floatingProfit >= 0 ? 'text-positive' : 'text-negative' : 'text-muted-foreground',
    },
    {
      label: '执行进度',
      value: isOpenEnded ? `${completedPeriods} 期` : `${completedPeriods}/${totalPeriods} 期`,
      detail: isOpenEnded ? '持续投入中。' : `已完成 ${Math.round(expectedProgressRatio * 100)}%。`,
      tone: 'text-white',
    },
    {
      label: isOpenEnded ? '最近投入' : '剩余可投',
      value: isOpenEnded ? formatMoney(latestPeriodAmount) : formatMoney(remainingBudget),
      detail: isOpenEnded ? '最近一期实际投入。' : `保留底仓 ${formatMoney(reserveFloor)}。`,
      tone: 'text-white',
    },
  ]

  return (
    <section className="section-shell">
      <header className="card dashboard-overview-card p-5">
        <div className="dashboard-overview-layout">
          <div className="dashboard-overview-main">
            <div className="min-w-0">
              <p className="label">Overview</p>
              <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.035em] text-white">{plan.name || '当前计划'}</h2>
              <p className="body-copy mt-2">{strategyLabel} · {frequencyLabel}</p>
            </div>

            <div className="dashboard-snapshot-grid mt-5">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  detail={metric.detail}
                  tone={metric.tone}
                />
              ))}
            </div>
          </div>

          <aside className="dashboard-action-summary subtle-panel p-4">
            <div>
              <div className="min-w-0">
                <p className="mini-kicker">Next Action</p>
                <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">下一步操作</h3>
              </div>
            </div>

            <div className="dashboard-action-facts">
              <div className="subtle-row">
                <span>下一期</span>
                <span className="data-subtle">第 {nextPeriodNumber} 期</span>
              </div>
              <div className="subtle-row">
                <span>预计日期</span>
                <span className="data-subtle">{nextContributionDate}</span>
              </div>
            </div>

            <button type="button" onClick={() => onNavigate('operation')} className="control-button-primary dashboard-action-button w-full">
              进入本期操作
              <ArrowRight size={16} />
            </button>
          </aside>
        </div>
      </header>

      <article className="chart-card dashboard-execution-status min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Execution Status</p>
            <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">计划状态</h3>
          </div>
        </div>
        <div className="dashboard-execution-body mt-5">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="data-value text-2xl">{isOpenEnded ? `${completedPeriods} 期` : `${completedPeriods} / ${totalPeriods} 期`}</p>
                <p className="mt-1 text-xs text-muted-foreground">已完成期数</p>
              </div>
              {!isOpenEnded ? (
                <div className="text-right">
                  <p className="data-value text-xl">{Math.round(progressRatio * 100)}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">预算推进</p>
                </div>
              ) : null}
            </div>
            {!isOpenEnded ? (
              <div className="mt-3 h-2 rounded-md bg-white/[0.05]">
                <div className={`h-2 rounded-md ${getProgressToneClass(progressRatio)}`} style={{ width: `${Math.min(progressRatio * 100, 100)}%` }} />
              </div>
            ) : null}
          </div>
          <div className="dashboard-execution-continuity subtle-panel p-3">
            <p className="data-value text-sm">
              {consecutivePeriods > 0 ? `已连续执行 ${consecutivePeriods} 期` : '等待首次执行'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestRecord.tag === 'paused' ? '最近一期已暂停。' : consecutivePeriods > 0 ? '当前没有漏投。' : '还没有连续记录。'}
            </p>
          </div>
        </div>
      </article>

      <article className="chart-card min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Allocation Diagnostics</p>
            <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">仓位诊断</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={quoteDisplayState.tone === 'fresh' ? 'text-positive' : quoteDisplayState.tone === 'stale' ? 'text-warning' : 'text-muted-foreground'}>
              {quoteDisplayState.text}
            </span>
            <button
              type="button"
              onClick={() => refreshMarketQuotes()}
              className="control-button h-8 min-h-8 w-8 shrink-0 p-0"
              aria-label="刷新市场报价"
              title="刷新市场报价"
              disabled={quoteSnapshot.loading}
            >
              <RefreshCcw size={14} className={quoteSnapshot.loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="dashboard-allocation-table mt-5">
          <div className="dashboard-allocation-table-head">
            <span>Ticker</span>
            <span>当前 / 目标</span>
            <span>偏离</span>
            <span className="text-right">市值</span>
          </div>
          <div className="dashboard-allocation-table-body">
            {currentWeightData.map((asset) => (
              <div key={asset.name} className="dashboard-allocation-table-row">
                <span className="data-value text-sm">{asset.name}</span>
                <span className="data-subtle">{asset.actualWeight}% / {asset.targetWeight}%</span>
                <span className={`data-subtle ${getGapToneClass(asset.weightGap)}`}>
                  {asset.weightGap >= 0 ? '+' : ''}{asset.weightGap}%
                </span>
                <span className="data-subtle text-right">{formatMoney(asset.value)}</span>
              </div>
            ))}
          </div>
          <div className="dashboard-allocation-table-footer">
            <span>{allocationHealthText}</span>
          </div>
        </div>
        </article>
    </section>
  )
}
