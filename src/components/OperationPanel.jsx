import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, LoaderCircle, RefreshCcw } from 'lucide-react'
import { getPeriodicAmount, getSuggestedShares as getDcaSuggestedShares } from '../utils/dcaCalc'
import {
  calcAllTargets,
  getInitialTargetValue,
  getRequiredInvestment,
  getSuggestedShares as getVaSuggestedShares,
  getUpdatedShares,
} from '../utils/vaCalc'
import { fetchQuote } from '../hooks/useQuote'

const decisionOptions = [
  { value: 'normal', label: '正常执行' },
  { value: 'underweight', label: '主动低配' },
  { value: 'paused', label: '本期暂停' },
]

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

export default function OperationPanel({ plan, records, onSaveRecord, onNavigate }) {
  const [operationDate, setOperationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tag, setTag] = useState('normal')
  const [note, setNote] = useState('')
  const [assetStates, setAssetStates] = useState([])
  const dateInputRef = useRef(null)

  const targetMatrix = useMemo(() => (plan ? calcAllTargets(plan) : []), [plan])
  const isOpenEnded = plan?.budgetMode === 'open-ended'

  useEffect(() => {
    if (!plan?.assets?.length) {
      setAssetStates([])
      return
    }

    const currentPeriod = plan?.budgetMode === 'open-ended'
      ? Math.max(Number(plan.currentPeriod) || 0, 0)
      : Math.min(Number(plan.currentPeriod) || 0, Math.max(0, (Number(plan.totalPeriods) || 1) - 1))
    const targetMatrix = calcAllTargets(plan)

    setAssetStates(
      plan.assets.map((asset, index) => {
        const bootstrapTargetValue = plan.strategy === 'VA' && currentPeriod === 0
          ? getPeriodicAmount(plan, asset.weight)
          : plan.strategy === 'VA'
            ? Number(targetMatrix?.[currentPeriod]?.[index] || 0)
            : getPeriodicAmount(plan, asset.weight)
        const bootstrapRequiredAmount = plan.strategy === 'VA' && currentPeriod === 0
          ? getPeriodicAmount(plan, asset.weight)
          : plan.strategy === 'VA'
            ? getRequiredInvestment(0, bootstrapTargetValue)
            : getPeriodicAmount(plan, asset.weight)

        return {
          ticker: asset.ticker,
          price: 0,
          priceSource: 'manual',
          loading: false,
          actualShares: 0,
          defaultSuggestedShares: 0,
          bootstrapRequiredAmount,
          fetchError: '',
        }
      }),
    )
  }, [plan])

  if (!plan) {
    return (
      <section className="card p-6 text-center text-slate-300">
        请先创建计划，再进入本期操作页。
      </section>
    )
  }

  const currentPeriod = isOpenEnded
    ? Math.max(Number(plan.currentPeriod) || 0, 0)
    : Math.min(Number(plan.currentPeriod) || 0, Math.max(0, (Number(plan.totalPeriods) || 1) - 1))
  const latestRecord = records.find((record) => record.planId === plan.id && record.periodIndex === currentPeriod - 1)

  const currentAssets = plan.assets.map((asset, index) => {
    const state = assetStates.find((item) => item.ticker === asset.ticker) || {
      ticker: asset.ticker,
      price: 0,
      priceSource: 'manual',
      loading: false,
      actualShares: 0,
      fetchError: '',
    }

    const price = Number(state.price) || 0
    const currentValueBefore = roundToTwo((Number(asset.currentShares) || 0) * price)
    const targetValue = plan.strategy === 'VA'
      ? currentPeriod === 0
        ? getInitialTargetValue(asset.weight, plan)
        : Number(targetMatrix?.[currentPeriod]?.[index] || 0)
      : getPeriodicAmount(plan, asset.weight)
    const requiredAmount = plan.strategy === 'VA'
      ? currentPeriod === 0
        ? roundToTwo(getPeriodicAmount(plan, asset.weight))
        : getRequiredInvestment(currentValueBefore, targetValue)
      : getPeriodicAmount(plan, asset.weight)
    const suggestedShares = plan.strategy === 'VA'
      ? getVaSuggestedShares(requiredAmount, price)
      : getDcaSuggestedShares(requiredAmount, price)
    const actualShares = Number(state.actualShares) || 0
    const actualAmount = roundToTwo(actualShares * price)

    return {
      ...asset,
      ...state,
      currentValueBefore,
      targetValue: roundToTwo(targetValue),
      requiredAmount: roundToTwo(requiredAmount),
      suggestedShares,
      actualShares: Number(state.actualShares) > 0 ? actualShares : suggestedShares,
      actualAmount: roundToTwo((Number(state.actualShares) > 0 ? actualShares : suggestedShares) * price),
    }
  })

  const totalActualAmount = roundToTwo(currentAssets.reduce((sum, asset) => sum + asset.actualAmount, 0))
  const historicalInvested = records
    .filter((record) => record.planId === plan.id)
    .reduce((sum, record) => sum + (Number(record.totalActualAmount) || 0), 0)
  const cumulativeInvested = roundToTwo(historicalInvested + totalActualAmount)
  const remainingBudget = isOpenEnded ? 0 : roundToTwo((Number(plan.totalBudget) || 0) - cumulativeInvested)

  const updateAssetState = (ticker, patch) => {
    setAssetStates((current) =>
      current.map((asset) => (asset.ticker === ticker ? { ...asset, ...patch } : asset)),
    )
  }

  const handleAutoFetch = async (ticker) => {
    updateAssetState(ticker, { loading: true, fetchError: '' })
    const result = await fetchQuote(ticker)

    if (typeof result.price === 'number') {
      updateAssetState(ticker, {
        loading: false,
        price: result.price,
        priceSource: 'auto',
        fetchError: '',
      })
      return
    }

    updateAssetState(ticker, {
      loading: false,
      priceSource: 'manual',
      fetchError: result.error || '获取失败，请手动输入。',
    })
  }

  const handleConfirm = () => {
    const record = {
      id: `record-${Date.now()}`,
      planId: plan.id,
      periodIndex: currentPeriod,
      date: new Date(operationDate).toISOString(),
      assets: currentAssets.map((asset) => ({
        ticker: asset.ticker,
        price: Number(asset.price) || 0,
        priceSource: asset.priceSource === 'auto' ? 'auto' : 'manual',
        targetValue: asset.targetValue,
        currentValueBefore: asset.currentValueBefore,
        requiredAmount: asset.requiredAmount,
        suggestedShares: asset.suggestedShares,
        actualShares: asset.actualShares,
        actualAmount: asset.actualAmount,
      })),
      tag,
      note,
      totalActualAmount,
      cumulativeInvested,
      remainingBudget,
    }

    const nextPlan = {
      ...plan,
      currentPeriod: (Number(plan.currentPeriod) || 0) + 1,
      assets: plan.assets.map((asset) => {
        const currentAsset = currentAssets.find((item) => item.ticker === asset.ticker)
        return {
          ...asset,
          currentShares: getUpdatedShares(asset.currentShares, currentAsset?.actualShares || 0),
        }
      }),
    }

    onSaveRecord(record, nextPlan)
    onNavigate('history')
  }

  return (
    <section className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="label">本期操作</p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              {isOpenEnded ? `第 ${currentPeriod + 1} 期 · 长期执行中` : `第 ${currentPeriod + 1} 期 / 共 ${plan.totalPeriods} 期`}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              dateInputRef.current?.showPicker?.()
              dateInputRef.current?.focus()
            }}
            className="flex w-fit items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition hover:border-accent/40 hover:bg-white/10"
          >
            <CalendarDays size={16} className="text-accent" />
            <span className="text-slate-400">执行日期</span>
            <span className="font-mono text-white">{operationDate}</span>
            <input
              ref={dateInputRef}
              type="date"
              value={operationDate}
              onChange={(event) => setOperationDate(event.target.value)}
              className="sr-only"
              tabIndex={-1}
              aria-label="执行日期"
            />
          </button>
        </div>
        {latestRecord ? (
          <p className="mt-4 text-sm text-slate-400">上期记录日期：{latestRecord.date.slice(0, 10)}</p>
        ) : (
          <p className="mt-4 text-sm text-slate-400">这是你的首次执行记录。</p>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {currentAssets.map((asset) => (
          <article key={asset.ticker} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="font-mono text-lg text-white">{asset.ticker}</h3>
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs text-accent">
                    {Math.round((Number(asset.weight) || 0) * 100)}%
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-400">{asset.name}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-slate-300">价格输入区</span>
                  <button
                    type="button"
                    onClick={() => handleAutoFetch(asset.ticker)}
                    disabled={asset.loading}
                    className="inline-flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {asset.loading ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                    {asset.loading ? '获取中...' : '自动获取'}
                  </button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="space-y-2">
                    <span className="text-sm text-slate-300">当前价格</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={asset.price}
                      onChange={(event) => updateAssetState(asset.ticker, { price: Number(event.target.value), priceSource: 'manual', fetchError: '' })}
                      className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 font-mono text-white outline-none transition focus:border-accent"
                    />
                  </label>
                  <span className={`rounded-full px-3 py-2 text-xs ${asset.priceSource === 'auto' ? 'bg-green-500/10 text-green-300' : 'bg-white/10 text-slate-300'}`}>
                    {asset.priceSource === 'auto' ? '自动' : '手动'}
                  </span>
                </div>
                {asset.fetchError ? <p className="mt-3 text-xs text-amber-300">{asset.fetchError}</p> : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-surface p-4">
                  <p className="label">当前持仓价值</p>
                  <p className="mt-3 font-mono text-xl text-white">{formatMoney(asset.currentValueBefore)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-surface p-4">
                  <p className="label">{plan.strategy === 'VA' ? 'VA目标值' : '本期固定投入'}</p>
                  <p className="mt-3 font-mono text-xl text-white">{formatMoney(asset.targetValue)}</p>
                  {isOpenEnded && Number(plan.periodicTarget) === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">当前为灵活决定模式，这里的建议值仅作为参考。</p>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-white/10 bg-surface p-4">
                  <p className="label">建议买入金额</p>
                  <p className="mt-3 font-mono text-xl text-accent">{formatMoney(asset.requiredAmount)}</p>
                  {isOpenEnded && Number(plan.periodicTarget) === 0 ? (
                    <p className="mt-2 text-xs text-slate-400">你可以按当期现金流和判断灵活调整实际投入。</p>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-white/10 bg-surface p-4">
                  <p className="label">建议买入股数</p>
                  <p className="mt-3 font-mono text-xl text-white">{asset.suggestedShares}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">实际买入股数</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={asset.actualShares}
                    onChange={(event) => updateAssetState(asset.ticker, { actualShares: Number(event.target.value) })}
                    className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 font-mono text-white outline-none transition focus:border-accent"
                  />
                </label>
                <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4">
                  <p className="label text-accent">实际投入金额</p>
                  <p className="mt-3 font-mono text-2xl text-white">{formatMoney(asset.actualAmount)}</p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="card p-5">
        <p className="label">执行决策</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {decisionOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTag(option.value)}
              className={`rounded-2xl px-4 py-3 text-sm transition ${
                tag === option.value ? 'bg-accent text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-sm text-slate-300">备注</span>
          <textarea
            rows="4"
            value={note}
            placeholder="记录你这期的判断..."
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
          />
        </label>

        <div className={`mt-5 grid gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 ${isOpenEnded ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <div>
            <p className="label">本期实际投入</p>
            <p className="mt-2 font-mono text-lg text-white">{formatMoney(totalActualAmount)}</p>
          </div>
          <div>
            <p className="label">累计投入</p>
            <p className="mt-2 font-mono text-lg text-white">{formatMoney(cumulativeInvested)}</p>
          </div>
          {!isOpenEnded ? (
            <div>
              <p className="label">剩余预算</p>
              <p className="mt-2 font-mono text-lg text-white">{formatMoney(remainingBudget)}</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-accent px-4 py-3 font-medium text-slate-950 transition hover:brightness-110"
        >
          确认记录本期操作
        </button>
      </div>
    </section>
  )
}
