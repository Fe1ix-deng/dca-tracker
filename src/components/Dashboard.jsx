import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowRight, RefreshCcw } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDeployableBudget, getRemainingDeployableBudget } from '../utils/budget'
import { calculateAverageCost, calculatePriceGapPct } from '../utils/portfolioCost'
import { fetchMarketQuotes } from '../services/marketQuotes'
import { getQuoteDisplayState, resolveMarketPrices } from '../utils/marketSnapshot'

const PIE_COLORS = [
  'rgb(var(--color-accent-rgb))',
  'rgb(var(--color-info-rgb))',
  'rgb(var(--color-positive-rgb))',
  'rgb(var(--color-warning-rgb))',
  'rgb(var(--color-negative-rgb))',
  'rgb(var(--color-text-soft-rgb))',
]

const chartTickStyle = {
  fill: 'rgb(var(--color-muted-foreground-rgb))',
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 12,
}

const chartTooltipStyle = {
  background: 'rgb(var(--color-panel-rgb) / 0.98)',
  border: '1px solid rgb(var(--color-text-rgb) / 0.1)',
  borderRadius: '0.5rem',
  color: 'rgb(var(--color-text-rgb))',
  boxShadow: '0 18px 36px rgba(3, 6, 14, 0.34)',
  fontFamily: '"IBM Plex Mono", monospace',
}

const chartColors = {
  accent: 'rgb(var(--color-accent-rgb))',
  textSoft: 'rgb(var(--color-text-soft-rgb))',
  grid: 'rgb(var(--color-text-rgb) / 0.07)',
  axis: 'rgb(var(--color-text-rgb) / 0.1)',
}

const chartInitialSizes = {
  trajectory: { width: 720, height: 360 },
  allocation: { width: 304, height: 304 },
  funding: { width: 640, height: 288 },
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatMoneyPrecise(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatCompactMoney(value) {
  const numeric = Number(value) || 0
  if (Math.abs(numeric) >= 1000) {
    return `$${(numeric / 1000).toFixed(Math.abs(numeric) >= 10000 ? 0 : 1)}k`
  }
  return `$${Math.round(numeric)}`
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

function formatOptionalMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return Number.isFinite(Number(value)) ? formatMoneyPrecise(value) : '--'
}

function formatMultiple(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '--'
  }
  return `${numeric.toFixed(2)}x`
}

function formatSignedMoney(value) {
  const numeric = Number(value) || 0
  const formatted = formatMoney(Math.abs(numeric))
  return `${numeric >= 0 ? '+' : '-'}${formatted}`
}

function formatQuoteTime(value) {
  const timestamp = new Date(value)
  if (Number.isNaN(timestamp.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(timestamp)
}

function getProfitLabel(value) {
  return (Number(value) || 0) >= 0 ? '盈利' : '亏损'
}

function getTagLabel(tag) {
  if (tag === 'normal') return '正常执行'
  if (tag === 'underweight') return '主动低配'
  if (tag === 'paused') return '本期暂停'
  return tag || '未标记'
}

function getTagBadgeClass(tag) {
  if (tag === 'normal') return 'badge-info'
  if (tag === 'underweight') return 'badge-warning'
  if (tag === 'paused') return 'badge-neutral'
  return 'badge-neutral'
}

function getProgressToneClass(ratio) {
  if (ratio < 0.55) return 'bg-accent'
  if (ratio < 0.85) return 'bg-warning'
  return 'bg-negative'
}

function getPacingBadgeClass(label) {
  if (label === '投入偏快') return 'badge-warning'
  if (label === '投入偏慢') return 'badge-neutral'
  return 'badge-info'
}

function getGapToneClass(value) {
  if (value >= 0.75) return 'text-accent'
  if (value <= -0.75) return 'text-warning'
  return 'text-textSoft'
}

function MetaTile({ label, value, detail, mono = false }) {
  return (
    <div className="subtle-panel dashboard-meta-tile p-4">
      <p className="mini-kicker">{label}</p>
      <p className={`mt-4 dashboard-tile-value ${mono ? 'data-value' : 'font-sans'}`}>{value}</p>
      {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  )
}

function MetricCard({ label, value, tone = 'text-white' }) {
  return (
    <article className="subtle-panel dashboard-metric-card p-5">
      <div className="min-w-0">
        <p className="mini-kicker">{label}</p>
        <p className={`mt-4 data-value dashboard-tile-value ${tone}`}>{value}</p>
      </div>
    </article>
  )
}

function LegendPill({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}

function ActiveWeightShape(props) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 9}
        outerRadius={outerRadius + 12}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.34}
      />
    </g>
  )
}

export default function Dashboard({ plan, records, onNavigate }) {
  const [activeWeightIndex, setActiveWeightIndex] = useState(0)
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
          创建好计划后，前往“本期操作”录入第一期价格与买入股数，总览页会自动生成趋势、仓位和预算检查。
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
  const latestDate = latestRecord.date.slice(0, 10)
  const strategyLabel = plan.strategy === 'VA' ? 'VA 定投' : 'DCA 定投'
  const frequencyLabel = plan.frequency === 'biweekly' ? '双周' : '每月'
  const latestTagLabel = getTagLabel(latestRecord.tag)
  const latestPeriodAmount = Number(latestRecord.totalActualAmount) || 0
  const recordedPriceMap = Object.fromEntries(latestRecord.assets.map((asset) => [asset.ticker, Number(asset.price) || 0]))
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
  const totalInvested = Number(latestRecord.cumulativeInvested) || 0
  const floatingProfit = marketValue - totalInvested
  const floatingProfitPct = totalInvested > 0 ? (floatingProfit / totalInvested) * 100 : 0
  const totalBudget = Number(plan.totalBudget) || 0
  const deployableBudget = getDeployableBudget(plan)
  const remainingBudget = Math.max(0, getRemainingDeployableBudget(plan, totalInvested))
  const reserveFloor = Math.max(0, totalBudget - deployableBudget)
  const progressRatio = deployableBudget > 0 ? Math.min(totalInvested / deployableBudget, 1) : 0
  const drawableBudget = remainingBudget
  const totalPeriods = Math.max(1, Number(plan.totalPeriods) || 1)
  const completedPeriods = planRecords.length
  const remainingPeriods = isOpenEnded ? 0 : Math.max(totalPeriods - completedPeriods, 0)
  const nextPeriodNumber = completedPeriods + 1
  const expectedProgressRatio = !isOpenEnded ? Math.min(completedPeriods / totalPeriods, 1) : 0
  const pacingGap = progressRatio - expectedProgressRatio
  const pacingLabel = pacingGap > 0.1 ? '投入偏快' : pacingGap < -0.1 ? '投入偏慢' : '节奏正常'
  const averageBudgetPerRemaining = remainingPeriods > 0 ? remainingBudget / remainingPeriods : 0

  const performanceData = planRecords.map((record) => {
    const marketValueAtClose = record.assets.reduce(
      (sum, asset) => sum + (Number(asset.currentValueBefore) || 0) + (Number(asset.actualAmount) || 0),
      0,
    )
    const cumulativeInvested = Number(record.cumulativeInvested) || 0
    const periodAmount = Number(record.totalActualAmount) || 0
    const netResult = marketValueAtClose - cumulativeInvested

    return {
      label: `P${record.periodIndex + 1}`,
      marketValue: marketValueAtClose,
      cumulativeInvested,
      periodAmount,
      netResult,
    }
  })

  const fundingData = planRecords.map((record) => ({
    label: `P${record.periodIndex + 1}`,
    amount: Number(record.totalActualAmount) || 0,
    cumulative: Number(record.cumulativeInvested) || 0,
  }))

  const averageCostMap = new Map(
    plan.assets.map((asset) => [asset.ticker, calculateAverageCost(asset, planRecords)]),
  )

  const currentWeightData = plan.assets.map((asset, index) => {
    const price = latestPriceMap[asset.ticker] || 0
    const value = (Number(asset.currentShares) || 0) * price
    const averageCostInfo = averageCostMap.get(asset.ticker) || { shares: 0, averageCost: null, hasKnownCost: false }
    const priceGapPct = calculatePriceGapPct(price, averageCostInfo.averageCost)
    const actualWeight = marketValue > 0 ? Number(((value / marketValue) * 100).toFixed(2)) : 0
    const targetWeight = Number(((Number(asset.weight) || 0) * 100).toFixed(2))

    return {
      name: asset.ticker,
      actualWeight,
      targetWeight,
      value,
      shares: Number(asset.currentShares) || 0,
      latestPrice: price,
      latestPriceSource: marketPriceMap[asset.ticker]?.source || 'record',
      averageCost: averageCostInfo.averageCost,
      weightGap: Number((actualWeight - targetWeight).toFixed(2)),
      priceGapPct,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }
  })

  const safeActiveWeightIndex = Math.min(activeWeightIndex, Math.max(currentWeightData.length - 1, 0))
  const activeWeight = currentWeightData[safeActiveWeightIndex]
  const latestPerformancePoint = performanceData[performanceData.length - 1] || {
    label: latestDate,
    marketValue,
    cumulativeInvested: totalInvested,
    periodAmount: latestPeriodAmount,
    netResult: floatingProfit,
  }
  const previousPerformancePoint = performanceData[performanceData.length - 2] || null
  const periodNetChange = previousPerformancePoint
    ? latestPerformancePoint.netResult - previousPerformancePoint.netResult
    : latestPerformancePoint.netResult
  const averagePeriodAmount = performanceData.length
    ? performanceData.reduce((sum, point) => sum + point.periodAmount, 0) / performanceData.length
    : 0
  const capitalMultiple = latestPerformancePoint.cumulativeInvested > 0
    ? latestPerformancePoint.marketValue / latestPerformancePoint.cumulativeInvested
    : 0

  const summaryMeta = [
    {
      label: '策略',
      value: strategyLabel,
    },
    {
      label: '节奏',
      value: frequencyLabel,
    },
    {
      label: '执行进度',
      value: isOpenEnded ? `${completedPeriods} 期` : `${completedPeriods}/${totalPeriods} 期`,
    },
    {
      label: '计划状态',
      value: isOpenEnded ? '持续投入中' : remainingPeriods > 0 ? `剩余 ${remainingPeriods} 期` : '已完成',
    },
  ]

  const metrics = [
    {
      label: '当前总市值',
      value: formatMoney(marketValue),
      meta: <>覆盖 <span className="data-subtle">{plan.assets.length}</span> 个标的，按行情报价或执行日价格估值。</>,
      tone: 'text-white',
    },
    {
      label: '累计总投入',
      value: formatMoney(totalInvested),
      meta: <>累计写入 <span className="data-subtle">{planRecords.length}</span> 条执行记录。</>,
      tone: 'text-white',
    },
    {
      label: '浮动盈亏',
      value: formatSignedMoney(floatingProfit),
      meta: <>{getProfitLabel(floatingProfit)} <span className="data-subtle">{formatPercent(floatingProfitPct)}</span>，当前仓位对累计投入的偏离。</>,
      tone: floatingProfit >= 0 ? 'text-positive' : 'text-negative',
    },
    {
      label: isOpenEnded ? '最近投入' : '剩余可投',
      value: isOpenEnded ? formatMoney(latestPeriodAmount) : formatMoney(remainingBudget),
      meta: isOpenEnded
        ? <>平均每期 <span className="data-subtle">{formatMoney(averagePeriodAmount)}</span>，持续执行。</>
        : <>保留底仓 <span className="data-subtle">{formatMoney(reserveFloor)}</span>，仍可动用 <span className="data-subtle">{formatMoney(drawableBudget)}</span>。</>,
      tone: 'text-white',
    },
  ]

  return (
    <section className="section-shell">
      <header className="card dashboard-overview-card p-5">
        <div className="dashboard-overview-layout">
          <div className="dashboard-overview-main">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="label">Overview</p>
                <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.035em] text-white">{plan.name || '当前计划'}</h2>
                <p className="body-copy mt-3 max-w-2xl">跟踪当前持仓、市值投入差额，以及下一期执行前需要看的预算和仓位信号。</p>
              </div>
            </div>

            <div className="dashboard-overview-matrix">
              <div className="dashboard-overview-meta">
                {summaryMeta.map((item) => (
                  <MetaTile
                    key={item.label}
                    label={item.label}
                    value={item.value}
                    detail={item.detail}
                    mono={item.mono}
                  />
                ))}
              </div>

              <div className="dashboard-snapshot-grid">
                {metrics.map((metric) => (
                  <MetricCard
                    key={metric.label}
                    label={metric.label}
                    value={metric.value}
                    tone={metric.tone}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="dashboard-action-summary subtle-panel p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="mini-kicker">Next Action</p>
                <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">下一步操作</h3>
              </div>
              <span className={getTagBadgeClass(latestRecord.tag)}>{latestTagLabel}</span>
            </div>

            <div className="dashboard-action-facts">
              <div className="subtle-row">
                <span>最新记录</span>
                <span className="data-subtle">{latestDate}</span>
              </div>
              <div className="subtle-row">
                <span>执行前确认</span>
                <span className="data-subtle">价格 / 股数</span>
              </div>
            </div>

            <button type="button" onClick={() => onNavigate('operation')} className="control-button-primary dashboard-action-button w-full">
              进入本期操作
              <ArrowRight size={16} />
            </button>

            <div className="dashboard-summary-divider" />

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mini-kicker">Execution Health</p>
                <h3 className="mt-2 text-[1rem] font-semibold tracking-[-0.02em] text-white">计划健康度</h3>
              </div>
              <span className="badge-neutral">{isOpenEnded ? 'Open-ended' : `${Math.round(progressRatio * 100)}%`}</span>
            </div>

            {!isOpenEnded ? (
              <div className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">预算推进</p>
                  <span className={getPacingBadgeClass(pacingLabel)}>{pacingLabel}</span>
                </div>
                <div className="h-2 rounded-md bg-white/[0.05]">
                  <div
                    className={`h-2 rounded-md transition-[width] ${getProgressToneClass(progressRatio)}`}
                    style={{ width: `${Math.min(progressRatio * 100, 100)}%` }}
                  />
                </div>
                <div className="space-y-2.5">
                  <div className="subtle-row">
                    <span>预算使用</span>
                    <span className="data-subtle">{Math.round(progressRatio * 100)}%</span>
                  </div>
                  <div className="subtle-row">
                    <span>期数进度</span>
                    <span className="data-subtle">{completedPeriods}/{totalPeriods}</span>
                  </div>
                  <div className="subtle-row">
                    <span>后续期均可用</span>
                    <span className="data-subtle">{formatMoney(averageBudgetPerRemaining)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5">
                <div className="subtle-row">
                  <span>最近投入</span>
                  <span className="data-subtle">{formatMoney(latestPeriodAmount)}</span>
                </div>
                <div className="subtle-row">
                  <span>平均投入</span>
                  <span className="data-subtle">{formatMoney(averagePeriodAmount)}</span>
                </div>
                <div className="subtle-row">
                  <span>累计期数</span>
                  <span className="data-subtle">{completedPeriods}</span>
                </div>
              </div>
            )}
          </aside>
        </div>
      </header>

      <article className="chart-card min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Allocation Diagnostics</p>
            <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">仓位诊断</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={quoteDisplayState.tone === 'fresh' ? 'text-positive' : quoteDisplayState.tone === 'stale' ? 'text-warning' : 'text-muted-foreground'}>
              {quoteDisplayState.text}{quoteSnapshot.asOf && !quoteSnapshot.error ? ` ${formatQuoteTime(quoteSnapshot.asOf)}` : ''}
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

        <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(280px,0.58fr)_minmax(0,1.42fr)]">
          <div className="grid min-w-0 gap-5">
            <div className="dashboard-pie-frame subtle-panel p-3">
              <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialSizes.allocation}>
                <PieChart>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value, _name, item) => [`${value}%`, `${item.payload.name} 当前权重`]}
                  />
                  <Pie
                    data={currentWeightData}
                    dataKey="actualWeight"
                    nameKey="name"
                    innerRadius={80}
                    outerRadius={112}
                    paddingAngle={2}
                    activeIndex={safeActiveWeightIndex}
                    activeShape={ActiveWeightShape}
                    animationDuration={180}
                    onMouseEnter={(_, index) => setActiveWeightIndex(index)}
                  >
                    {currentWeightData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {activeWeight ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="dashboard-pie-center text-center">
                    <p className="label">当前聚焦</p>
                    <p className="mt-3 data-value text-[1.35rem] font-semibold">{activeWeight.name}</p>
                    <p className="dashboard-pie-center-meta mt-2">
                      <span className="data-subtle text-sm">{activeWeight.actualWeight}%</span>
                      <span className="data-subtle text-sm">{formatMoney(activeWeight.value)}</span>
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2.5">
              {currentWeightData.map((asset, index) => (
                <button
                  key={asset.name}
                  type="button"
                  onMouseEnter={() => setActiveWeightIndex(index)}
                  onFocus={() => setActiveWeightIndex(index)}
                  className={`subtle-panel px-4 py-3 text-left transition ${
                    index === safeActiveWeightIndex
                      ? 'border-white/[0.12] bg-white/[0.05]'
                      : 'hover:border-white/[0.10] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: asset.color }} />
                      <span className="data-value text-sm">{asset.name}</span>
                    </div>
                    <span className="data-subtle text-sm">{asset.actualWeight}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                    <span>目标 {asset.targetWeight}%</span>
                    <span className={`data-subtle ${getGapToneClass(asset.weightGap)}`}>
                      {asset.weightGap >= 0 ? '+' : ''}{asset.weightGap}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="surface-table min-w-0">
            <div className="surface-table-head min-w-[40rem] grid-cols-[minmax(0,0.82fr)_minmax(0,0.82fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.68fr)]">
              <span>Ticker</span>
              <span>仓位</span>
              <span>平均成本</span>
              <span>最新价格</span>
              <span className="text-right">偏离</span>
            </div>

            <div className="min-w-[40rem] divide-y divide-white/[0.06]">
              {currentWeightData.map((asset, index) => (
                <button
                  key={asset.name}
                  type="button"
                  onMouseEnter={() => setActiveWeightIndex(index)}
                  onFocus={() => setActiveWeightIndex(index)}
                  className={`surface-table-row w-full grid-cols-[minmax(0,0.82fr)_minmax(0,0.82fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.68fr)] items-center text-left transition ${
                    index === safeActiveWeightIndex
                      ? 'bg-white/[0.04]'
                      : 'hover:bg-white/[0.025]'
                  }`}
                >
                  <div>
                    <p className="data-value text-sm">{asset.name}</p>
                    <p className="mt-1 data-subtle text-xs">{asset.shares} 股</p>
                  </div>
                  <div className="dashboard-weight-value">
                    <p className="data-subtle text-sm">{asset.actualWeight}%</p>
                    <p className="dashboard-weight-target mt-1 text-xs text-muted-foreground">
                      <span>目标</span>
                      <span className="data-subtle">{asset.targetWeight}%</span>
                    </p>
                  </div>
                  <div>
                    <p className="data-subtle text-sm">{formatOptionalMoney(asset.averageCost)}</p>
                  </div>
                  <div>
                    <p className="data-subtle text-sm">{formatMoneyPrecise(asset.latestPrice)}</p>
                    <p className={`mt-1 text-xs ${asset.priceGapPct === null ? 'text-muted-foreground' : asset.priceGapPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {formatPercent(asset.priceGapPct)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`data-subtle text-sm ${getGapToneClass(asset.weightGap)}`}>
                      {asset.weightGap >= 0 ? '+' : ''}{asset.weightGap}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">权重偏离</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>

      <article className="chart-card flex min-h-[32rem] min-w-0 flex-col">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Capital Progress</p>
            <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">资产表现</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            <LegendPill color={chartColors.accent} label="组合市值" />
            <LegendPill color={chartColors.textSoft} label="累计投入" />
          </div>
        </div>

        <div className="dashboard-performance-grid mt-5">
          <div className="subtle-panel dashboard-performance-tile p-4">
            <p className="mini-kicker">本期变化</p>
            <p className={`mt-3 data-value text-xl ${periodNetChange >= 0 ? 'text-positive' : 'text-negative'}`}>
              {formatSignedMoney(periodNetChange)}
            </p>
          </div>
          <div className="subtle-panel dashboard-performance-tile p-4">
            <p className="mini-kicker">市值 / 投入</p>
            <p className="mt-3 data-value text-xl">{formatMultiple(capitalMultiple)}</p>
          </div>
        </div>

        <div className="dashboard-trajectory-plot">
          <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialSizes.trajectory}>
            <AreaChart
              data={performanceData}
              margin={{ top: 18, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="trajectoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.26} />
                  <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={chartColors.grid} />
              <XAxis
                dataKey="label"
                tick={chartTickStyle}
                tickLine={false}
                axisLine={{ stroke: chartColors.axis }}
                height={34}
                tickMargin={10}
              />
              <YAxis
                tick={chartTickStyle}
                tickLine={false}
                axisLine={{ stroke: chartColors.axis }}
                width={66}
                tickMargin={10}
                tickFormatter={(value) => formatCompactMoney(value)}
              />
              <Tooltip
                contentStyle={chartTooltipStyle}
                labelStyle={{ color: chartColors.textSoft, fontWeight: 600 }}
                itemStyle={{ color: chartColors.textSoft }}
                cursor={{ stroke: chartColors.axis, strokeWidth: 1 }}
                formatter={(value, name, item) => {
                  const label = name === 'marketValue' ? '组合市值' : '累计投入'
                  const delta = Number(item.payload.marketValue || 0) - Number(item.payload.cumulativeInvested || 0)
                  return [formatMoney(value), `${label}${name === 'marketValue' ? ` · 差额 ${formatSignedMoney(delta)}` : ''}`]
                }}
              />
              <Area
                type="monotone"
                dataKey="marketValue"
                stroke={chartColors.accent}
                fill="url(#trajectoryGradient)"
                strokeWidth={2.4}
                name="marketValue"
              />
              <Line
                type="monotone"
                dataKey="cumulativeInvested"
                stroke={chartColors.textSoft}
                strokeWidth={1.8}
                strokeDasharray="5 5"
                dot={false}
                name="cumulativeInvested"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="grid min-w-0 gap-5">
        <article className="chart-card min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label">Funding Rhythm</p>
              <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">投入节奏</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              <LegendPill color={chartColors.accent} label="本期投入" />
              <LegendPill color={chartColors.textSoft} label="累计投入" />
            </div>
          </div>

          <div className="dashboard-funding-plot mt-5">
            <ResponsiveContainer width="100%" height="100%" initialDimension={chartInitialSizes.funding}>
              <AreaChart data={fundingData}>
                <defs>
                  <linearGradient id="fundingAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColors.accent} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={chartColors.accent} stopOpacity={0.015} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={chartColors.grid} />
                <XAxis dataKey="label" tick={chartTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={chartTickStyle} tickLine={false} axisLine={false} width={72} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ color: chartColors.textSoft, fontWeight: 600 }}
                  itemStyle={{ color: chartColors.textSoft }}
                  formatter={(value, name) => [formatMoney(value), name === 'amount' ? '本期投入' : '累计投入']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke={chartColors.accent}
                  fill="url(#fundingAreaGradient)"
                  strokeWidth={2.15}
                  name="本期投入"
                />
                <Line type="monotone" dataKey="cumulative" stroke={chartColors.textSoft} strokeWidth={1.8} dot={false} name="累计投入" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  )
}
