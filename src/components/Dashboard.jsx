import { ArrowRight, RefreshCcw } from 'lucide-react'
import { getDeployableBudget, getRemainingDeployableBudget } from '../utils/budget'
import { useMarketSnapshot } from '../hooks/useMarketSnapshot'
import { getLocalDate } from '../utils/executionDate'
import { useLocalDate } from '../hooks/useLocalDate'
import { canonicalTicker } from '../utils/planConstraints'
import PriceProvenance from './PriceProvenance'
import { getQuoteDisplayState } from '../utils/marketSnapshot'
import { formatScheduleDate, getContributionState } from '../utils/contributionSchedule'
import { calculatePortfolioCostBasis } from '../utils/portfolioCost'
import { formatPrice } from '../utils/marketPrecision'
import { formatMoney, formatSignedMoney } from '../utils/money'
import { useI18n } from '../i18n/index.jsx'
import FaqSummary from './FaqSummary'


function formatShares(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return '0'

  return numeric.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  })
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

export default function Dashboard({ plan, records, onNavigate, asOfDate: providedAsOfDate }) {
  const { t, language } = useI18n()
  const localDate = useLocalDate()
  const asOfDate = providedAsOfDate || localDate || getLocalDate()
  const {snapshots,holdings,portfolio,refresh:refreshMarketQuotes,requestSummary} = useMarketSnapshot({plan,records,asOfDate})
  if (!plan) {
    return (
      <section className="section-shell">
        <div className="empty-state text-textSoft">
          <p className="label">{t('总览')}</p>
          <h2 className="empty-state-title">{t('还没有计划')}</h2>
          <p className="body-copy mx-auto mt-3 max-w-xl">{t('先去设置页创建你的第一份定投计划，总览页会在这里呈现资产表现和预算状态。')}</p>
          <button type="button" onClick={() => onNavigate('settings')} className="control-button-primary mt-6">
            {t('创建第一份计划')}
          </button>
        </div>
        <FaqSummary onNavigate={onNavigate} showCreate />
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
      <section className="section-shell">
        <div className="empty-state">
          <p className="label">{t('总览')}</p>
          <h2 className="empty-state-title">{t('还没有操作记录')}</h2>
          <p className="body-copy mx-auto mt-3 max-w-2xl">
            {t('创建好计划后，前往“本期操作”录入第一期价格与买入股数，总览页会在这里呈现趋势、仓位和预算检查。')}
          </p>
          <button
            type="button"
            onClick={() => onNavigate('operation')}
            className="control-button-primary mt-6"
          >
            {t('去完成第一期定投')}
          </button>
        </div>
        <FaqSummary onNavigate={onNavigate} />
      </section>
    )
  }

  const latestRecord = planRecords[planRecords.length - 1]
  const contributionState = getContributionState({ plan, records, today: asOfDate })
  const strategyLabel = plan.strategy === 'VA' ? t('VA 定投') : t('DCA 定投')
  const frequencyLabel = plan.frequency === 'biweekly' ? t('双周') : t('每月')
  const latestPeriodAmount = Number(latestRecord.totalActualAmount) || 0
  const latestPriceMap = Object.fromEntries(Object.entries(snapshots).map(([ticker,snapshot])=>[ticker,snapshot.reliable?snapshot.price:null]))
  const quoteDisplayState = getQuoteDisplayState(requestSummary)
  const marketValue = portfolio.marketValue
  const valuationComplete = marketValue !== null
  const { costBasis, hasKnownCost } = calculatePortfolioCostBasis(plan.assets.map(asset=>{const holding=holdings[canonicalTicker(asset.ticker)];return holding?.reliable?{...asset,currentShares:holding.shares,initialShares:holding.initialShares,initialAverageCost:holding.initialAverageCost}:asset}), planRecords)
  const floatingProfit = hasKnownCost && valuationComplete ? marketValue - costBasis : null
  const floatingProfitPct = hasKnownCost && valuationComplete && costBasis > 0 ? (floatingProfit / costBasis) * 100 : null
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
  const nextContributionDate = contributionState.nextDate ? formatScheduleDate(contributionState.nextDate, language) : t(contributionState.status === 'completed' ? '计划已完成' : contributionState.status === 'limited' ? '已达到记录上限' : '日期未知，请检查最近记录')
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
    const price = latestPriceMap[canonicalTicker(asset.ticker)]
    const holding = holdings[canonicalTicker(asset.ticker)]
    const value = holding?.reliable && (holding.shares===0 || price>0) ? holding.shares * (price||0) : null
    const actualWeight = valuationComplete && marketValue > 0 ? Number(((value / marketValue) * 100).toFixed(2)) : null
    const targetWeight = Number(((Number(asset.weight) || 0) * 100).toFixed(2))

    return {
      name: asset.ticker,
      shares: holding?.reliable ? holding.shares : null,
      actualWeight,
      targetWeight,
      price,
      value,
      weightGap: actualWeight===null?null:Number((actualWeight - targetWeight).toFixed(2)),
    }
  })

  const largestWeightGap = currentWeightData.reduce(
    (largest, asset) => Math.max(largest, Math.abs(asset.weightGap)),
    0,
  )
  const allocationHealthText = !valuationComplete ? t('价格或持仓口径不完整，暂不判断仓位偏离。') : largestWeightGap > 5
    ? t('最大偏离 {gap}%，建议复核。', { gap: largestWeightGap.toFixed(2) })
    : t('没有超过 ±5% 的显著偏离。')

  const metrics = [
    {
      label: t('当前总市值'),
      value: valuationComplete ? formatMoney(marketValue, plan) : '--',
      detail: valuationComplete ? t('参考估值，非实时。') : t('估值不完整：{count} 个持仓资产缺少可靠价格或持仓口径。',{count:portfolio.missingCount}),
      tone: 'text-white',
    },
    {
      label: t('浮动盈亏'),
      value: hasKnownCost && valuationComplete ? formatSignedMoney(floatingProfit, plan) : '--',
      detail: !valuationComplete ? t('估值不完整，暂不显示盈亏。') : hasKnownCost ? `${t(getProfitLabel(floatingProfit))} ${formatPercent(floatingProfitPct)}。` : t('请补充已有持仓成本。'),
      tone: hasKnownCost ? floatingProfit >= 0 ? 'text-positive' : 'text-negative' : 'text-muted-foreground',
    },
    {
      label: t('执行进度'),
      value: isOpenEnded ? t('第 {period} 期', { period: completedPeriods }) : `${completedPeriods}/${totalPeriods} ${t('期')}`,
      detail: isOpenEnded ? t('持续投入中。') : `${t('已完成')} ${Math.round(expectedProgressRatio * 100)}%。`,
      tone: 'text-white',
    },
    {
      label: isOpenEnded ? t('最近投入') : t('剩余可投'),
      value: isOpenEnded ? formatMoney(latestPeriodAmount, plan) : formatMoney(remainingBudget, plan),
      detail: isOpenEnded ? t('最近一期实际投入。') : t('保留底仓 {amount}。', { amount: formatMoney(reserveFloor, plan) }),
      tone: 'text-white',
    },
  ]

  return (
    <section className="section-shell">
      <header className="card dashboard-overview-card p-5">
        <div className="dashboard-overview-layout">
          <div className="dashboard-overview-main">
            <div className="min-w-0">
              <p className="label">{t('总览')}</p>
              <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.035em] text-white">{plan.name || t('当前计划')}</h2>
              <p className="body-copy mt-2">{strategyLabel} · {frequencyLabel}</p>
            </div>

            <div role="region" aria-label={t('组合估值')} className="dashboard-snapshot-grid mt-5">
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
            {portfolio.mixed?<p className="mt-3 text-sm text-warning">{t('使用混合来源或不同时间的价格。')}</p>:null}
            {!valuationComplete?<p className="mt-2 text-sm text-muted-foreground">{t('参考估值，非实时。')}</p>:null}
          </div>

          <aside className="dashboard-action-summary subtle-panel p-4">
            <div>
              <div className="min-w-0">
                <p className="mini-kicker">{t('下一步操作')}</p>
                <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">{t('下一步操作')}</h3>
              </div>
            </div>

            <div className="dashboard-action-facts">
              <div className="subtle-row">
                <span>{t('下一期')}</span>
                <span className="data-subtle">{t('第 {period} 期', { period: nextPeriodNumber })}</span>
              </div>
              <div className="subtle-row">
                <span>{t('预计日期')}</span>
                <span className="data-subtle">{nextContributionDate}</span>
              </div>
              {contributionState.status === 'overdue' ? <p className="mt-3 text-sm text-warning">{t('下一期已逾期，请核对是否尚未记录。')}</p> : null}
            </div>

            {contributionState.status !== 'completed' && contributionState.status !== 'limited' ? <button type="button" onClick={() => onNavigate('operation')} className="control-button-primary dashboard-action-button w-full">
              {t('进入本期操作')} <ArrowRight size={16} />
            </button> : <p className="text-sm text-muted-foreground">{nextContributionDate}</p>}
          </aside>
        </div>
      </header>

      <article className="chart-card dashboard-execution-status min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">{t('执行状态')}</p>
            <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">{t('计划状态')}</h3>
          </div>
        </div>
        <div className="dashboard-execution-body mt-5">
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="data-value text-2xl">{isOpenEnded ? `${completedPeriods} ${t('期')}` : `${completedPeriods} / ${totalPeriods} ${t('期')}`}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('已完成期数')}</p>
              </div>
              {!isOpenEnded ? (
                <div className="text-right">
                  <p className="data-value text-xl">{Math.round(progressRatio * 100)}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('预算推进')}</p>
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
              {consecutivePeriods > 0 ? t('已连续执行 {periods} 期', { periods: consecutivePeriods }) : t('等待首次执行')}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestRecord.tag === 'paused' ? t('最近一期已暂停。') : consecutivePeriods > 0 ? t('当前没有漏投。') : t('还没有连续记录。')}
            </p>
          </div>
        </div>
      </article>

      <article className="chart-card min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">{t('仓位偏离')}</p>
            <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">{t('仓位诊断')}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={quoteDisplayState.tone === 'fresh' ? 'text-positive' : quoteDisplayState.tone === 'stale' ? 'text-warning' : 'text-muted-foreground'}>
              {t(quoteDisplayState.text,{success:requestSummary.succeeded,total:requestSummary.total})}
            </span>
            <button
              type="button"
              onClick={() => refreshMarketQuotes()}
              className="control-button h-8 min-h-8 w-8 shrink-0 p-0"
              aria-label={t('刷新市场报价')}
              title={t('刷新市场报价')}
              disabled={requestSummary.loading}
            >
              <RefreshCcw size={14} className={requestSummary.loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="dashboard-allocation-table mt-5">
          <div className="dashboard-allocation-table-head">
            <span>{t('标的')}</span>
            <span>{t('持仓股数')}</span>
            <span>{t('当前 / 目标')}</span>
            <span>{t('偏离')}</span>
            <span className="text-right">{t('市值')}</span>
          </div>
          <div className="dashboard-allocation-table-body">
            {currentWeightData.map((asset) => (
              <div key={asset.name} className="dashboard-allocation-table-row">
                <span className="data-value text-sm">
                  {asset.name}
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">{t('价格')} {asset.price>0?formatPrice(asset.price, plan):'--'}</span><PriceProvenance snapshot={snapshots[canonicalTicker(asset.name)]} holding={holdings[canonicalTicker(asset.name)]}/>
                </span>
                <span className="data-subtle">{asset.shares===null?'--':formatShares(asset.shares)} {t('股')}</span>
                <span className="data-subtle">{asset.actualWeight===null?'--':asset.actualWeight+'%'} / {asset.targetWeight}%</span>
                <span className={`data-subtle ${getGapToneClass(asset.weightGap)}`}>
                  {asset.weightGap===null?'--':(asset.weightGap>=0?'+':'')+asset.weightGap+'%'}
                </span>
                <span className="data-subtle text-right">{asset.value===null?'--':formatMoney(asset.value, plan)}</span>
              </div>
            ))}
          </div>
          <div className="dashboard-allocation-table-footer">
            <span>{allocationHealthText}</span>
          </div>
        </div>
        </article>
      <FaqSummary onNavigate={onNavigate} />
    </section>
  )
}
