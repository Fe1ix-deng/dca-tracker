import { useEffect, useMemo, useState } from 'react'
import { Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { estimateTargetYield } from '../utils/yieldEstimator'

const strategyOptions = [
  { value: 'VA', label: 'VA定投' },
  { value: 'DCA', label: 'DCA定额' },
]

const budgetModeOptions = [
  {
    value: 'fixed',
    label: '固定预算',
    description: '我有一笔闲钱，计划分X期投完（现有逻辑）',
  },
  {
    value: 'open-ended',
    label: '无限定投',
    description: '我用每期收入的固定部分持续投入，没有终点',
  },
]

const frequencyOptions = [
  { value: 'biweekly', label: '双周' },
  { value: 'monthly', label: '月' },
]

const OPEN_ENDED_PLACEHOLDER_PERIODS = 9999

function createDraftPlan() {
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
    createdAt: '',
  }
}

function normalizeFormPlan(source) {
  const base = source ? { ...source, assets: [...(source.assets || [])] } : createDraftPlan()
  const budgetMode = base.budgetMode === 'open-ended' ? 'open-ended' : 'fixed'

  return {
    ...createDraftPlan(),
    ...base,
    budgetMode,
    periodicTarget: Number(base.periodicTarget) || 0,
    totalPeriods: budgetMode === 'open-ended'
      ? Math.max(Number(base.totalPeriods) || OPEN_ENDED_PLACEHOLDER_PERIODS, OPEN_ENDED_PLACEHOLDER_PERIODS)
      : Math.max(1, Number(base.totalPeriods) || 1),
  }
}

function createAssetDraft() {
  return {
    ticker: '',
    name: '',
    weight: 0.1,
    currentShares: 0,
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}

function generateId() {
  return `plan-${Date.now()}`
}

export default function Settings({ plan, onSavePlan, onNavigate, onClearAllData, plans = [] }) {
  const [form, setForm] = useState(() => normalizeFormPlan(plan))
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [assetDraft, setAssetDraft] = useState(createAssetDraft())
  const [estimatedRange, setEstimatedRange] = useState(null)

  useEffect(() => {
    setForm(normalizeFormPlan(plan))
    setShowAssetForm(false)
    setAssetDraft(createAssetDraft())
    setEstimatedRange(null)
  }, [plan])

  const totalWeight = useMemo(
    () => form.assets.reduce((sum, asset) => sum + (Number(asset.weight) || 0), 0),
    [form.assets],
  )

  const isOpenEnded = form.budgetMode === 'open-ended'
  const reservedCash = (Number(form.totalBudget) || 0) * (Number(form.reserveRatio) || 0)
  const deployableCash = (Number(form.totalBudget) || 0) - reservedCash
  const isWeightValid = form.assets.length > 0 && Math.abs(totalWeight - 1) < 0.001
  const hasValidBudget = isOpenEnded ? Number(form.periodicTarget) >= 0 : Number(form.totalBudget) > 0 && Number(form.totalPeriods) > 0
  const canSave = form.name.trim() && hasValidBudget && isWeightValid

  const updateField = (key, value) => {
    setForm((current) => {
      const next = {
        ...current,
        [key]: value,
      }

      if (key === 'budgetMode') {
        return {
          ...next,
          budgetMode: value,
          totalPeriods: value === 'open-ended'
            ? Math.max(Number(current.totalPeriods) || OPEN_ENDED_PLACEHOLDER_PERIODS, OPEN_ENDED_PLACEHOLDER_PERIODS)
            : Math.max(1, Number(current.totalPeriods) || 24),
        }
      }

      return next
    })
  }

  const saveAssetDraft = () => {
    if (!assetDraft.ticker.trim()) {
      return
    }

    setForm((current) => ({
      ...current,
      assets: [
        ...current.assets,
        {
          ticker: assetDraft.ticker.trim().toUpperCase(),
          name: assetDraft.name.trim() || assetDraft.ticker.trim().toUpperCase(),
          weight: Number(assetDraft.weight) || 0,
          currentShares: Number(assetDraft.currentShares) || 0,
        },
      ],
    }))

    setAssetDraft(createAssetDraft())
    setShowAssetForm(false)
  }

  const removeAsset = (ticker) => {
    setForm((current) => ({
      ...current,
      assets: current.assets.filter((asset) => asset.ticker !== ticker),
    }))
  }

  const updateAssetWeight = (ticker, weight) => {
    setForm((current) => ({
      ...current,
      assets: current.assets.map((asset) =>
        asset.ticker === ticker
          ? {
              ...asset,
              weight,
            }
          : asset,
      ),
    }))
  }

  const handleEstimateYield = () => {
    const estimation = estimateTargetYield(form.assets)
    updateField('targetAnnualReturn', estimation.estimatedYield)
    setEstimatedRange({
      minYield: estimation.minYield,
      maxYield: estimation.maxYield,
    })
  }

  const handleSave = () => {
    if (!canSave) {
      return
    }

    const nextPlan = {
      ...form,
      id: form.id || generateId(),
      name: form.name.trim(),
      budgetMode: isOpenEnded ? 'open-ended' : 'fixed',
      totalBudget: isOpenEnded ? 0 : (Number(form.totalBudget) || 0),
      reserveRatio: isOpenEnded ? 0 : (Number(form.reserveRatio) || 0.2),
      totalPeriods: isOpenEnded
        ? Math.max(Number(form.totalPeriods) || OPEN_ENDED_PLACEHOLDER_PERIODS, OPEN_ENDED_PLACEHOLDER_PERIODS)
        : (Number(form.totalPeriods) || 1),
      periodicTarget: isOpenEnded ? (Number(form.periodicTarget) || 0) : (Number(form.periodicTarget) || 0),
      currentPeriod: Number(form.currentPeriod) || 0,
      targetAnnualReturn: Number(form.targetAnnualReturn) || 0.25,
      createdAt: form.createdAt || new Date().toISOString(),
      assets: form.assets.map((asset) => ({
        ...asset,
        ticker: asset.ticker.trim().toUpperCase(),
        name: asset.name?.trim() || asset.ticker.trim().toUpperCase(),
        weight: Number(asset.weight) || 0,
        currentShares: Number(asset.currentShares) || 0,
      })),
    }

    onSavePlan(nextPlan)
    onNavigate('dashboard')
  }

  const handleCreateNew = () => {
    setForm(createDraftPlan())
    setShowAssetForm(false)
    setAssetDraft(createAssetDraft())
    setEstimatedRange(null)
  }

  const handleClearAll = () => {
    const confirmed = window.confirm('此操作将清除所有计划和历史记录，无法恢复，确认继续？')
    if (!confirmed) {
      return
    }

    onClearAllData?.()
    setForm(createDraftPlan())
    setShowAssetForm(false)
    setAssetDraft(createAssetDraft())
    setEstimatedRange(null)
    onNavigate('settings')
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label">计划配置</p>
            <h2 className="mt-2 text-xl font-semibold text-white">计划设置</h2>
            <p className="mt-2 text-sm text-slate-400">
              {plan ? `当前计划：${plan.name} · 共 ${plans.length || 1} 份计划` : '首次进入请先创建计划，保存后将进入总览页。'}
            </p>
          </div>
          {plan ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm(normalizeFormPlan(plan))}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                修改计划
              </button>
              <button
                type="button"
                onClick={handleCreateNew}
                className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
              >
                新建计划
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">计划名称</span>
            <input
              type="text"
              value={form.name}
              placeholder="例如：2026美股VA定投"
              onChange={(event) => updateField('name', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
            />
          </label>

          <div className="space-y-3">
            <span className="text-sm text-slate-300">预算模式</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {budgetModeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    form.budgetMode === option.value ? 'border-accent bg-accent/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="budgetMode"
                    value={option.value}
                    checked={form.budgetMode === option.value}
                    onChange={() => updateField('budgetMode', option.value)}
                    className="sr-only"
                  />
                  <div className="font-medium">{option.label}</div>
                  <p className="mt-2 text-xs text-slate-400">{option.description}</p>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="text-sm text-slate-300">策略类型</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {strategyOptions.map((option) => (
                <label
                  key={option.value}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    form.strategy === option.value ? 'border-accent bg-accent/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={option.value}
                    checked={form.strategy === option.value}
                    onChange={() => updateField('strategy', option.value)}
                    className="sr-only"
                  />
                  <div className="font-medium">{option.label}</div>
                  {form.strategy === option.value ? (
                    <p className="mt-2 text-xs text-slate-400">
                      {option.value === 'VA'
                        ? '根据市值与目标的差距决定每期投多少——涨了少买，跌了多买，自动抄底。'
                        : '每期固定投入相同金额，不管涨跌，纪律执行，适合懒人长期持有。'}
                    </p>
                  ) : null}
                </label>
              ))}
            </div>
          </div>

          {isOpenEnded ? (
            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <label className="space-y-2 block">
                <span className="text-sm text-slate-300">每期计划投入金额（美元）</span>
                <input
                  type="number"
                  min="0"
                  value={form.periodicTarget}
                  onChange={(event) => updateField('periodicTarget', Number(event.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
                />
              </label>
              <p className="text-sm text-slate-400">
                实际每期可多可少，这里填你的目标金额，仅用于生成建议，不做硬性限制。
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">总预算（美元）</span>
                  <input
                    type="number"
                    min="0"
                    value={form.totalBudget}
                    onChange={(event) => updateField('totalBudget', Number(event.target.value))}
                    className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-300">总期数</span>
                  <input
                    type="number"
                    min="1"
                    value={form.totalPeriods}
                    onChange={(event) => updateField('totalPeriods', Number(event.target.value))}
                    className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
                  />
                </label>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-300">保留现金比例</span>
                  <span className="font-mono text-white">{Math.round((Number(form.reserveRatio) || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.3"
                  step="0.01"
                  value={form.reserveRatio}
                  onChange={(event) => updateField('reserveRatio', Number(event.target.value))}
                  className="w-full accent-blue-400"
                />
                <p className="text-sm text-slate-400">
                  保留 {formatMoney(reservedCash)}，可投 {formatMoney(deployableCash)}
                </p>
              </div>
            </>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">定投频率</span>
              <select
                value={form.frequency}
                onChange={(event) => updateField('frequency', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {form.strategy === 'VA' ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-300">目标年化收益率</span>
                  <button
                    type="button"
                    onClick={handleEstimateYield}
                    className="inline-flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent transition hover:bg-accent/20"
                  >
                    <Sparkles size={14} />
                    自动测算
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-300">当前建议值</span>
                  <span className="font-mono text-white">{formatPercent(form.targetAnnualReturn)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.01"
                  value={form.targetAnnualReturn}
                  onChange={(event) => updateField('targetAnnualReturn', Number(event.target.value))}
                  className="w-full accent-blue-400"
                />
                {estimatedRange ? (
                  <div className="space-y-2 text-xs text-slate-400">
                    <p>
                      根据组合历史表现估算，建议范围 {formatPercent(estimatedRange.minYield)}~{formatPercent(estimatedRange.maxYield)}（上下浮动5%），可手动调整
                    </p>
                    <p>
                      数据基于各标的10年历史CAGR（含股息再投资），TSLA/IBIT等高波动标的历史收益不代表未来表现，仅供参考。
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                DCA 策略不需要设置目标年化收益率。
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">资产配置</p>
                <p className="mt-1 text-xs text-slate-400">所有权重之和必须等于 100%</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetForm((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
              >
                <Plus size={16} />
                添加标的
              </button>
            </div>

            {showAssetForm ? (
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-surface p-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Ticker</span>
                  <input
                    type="text"
                    value={assetDraft.ticker}
                    onChange={(event) => setAssetDraft((current) => ({ ...current, ticker: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-panel px-4 py-3 text-white outline-none transition focus:border-accent"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">显示名称</span>
                  <input
                    type="text"
                    value={assetDraft.name}
                    onChange={(event) => setAssetDraft((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-panel px-4 py-3 text-white outline-none transition focus:border-accent"
                  />
                </label>
                <div className="space-y-3 sm:col-span-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">权重</span>
                    <span className="font-mono text-white">{Math.round((Number(assetDraft.weight) || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.01"
                    value={assetDraft.weight}
                    onChange={(event) => setAssetDraft((current) => ({ ...current, weight: Number(event.target.value) }))}
                    className="w-full accent-blue-400"
                  />
                </div>
                <div className="flex justify-end sm:col-span-2">
                  <button
                    type="button"
                    onClick={saveAssetDraft}
                    className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-slate-950 transition hover:brightness-110"
                  >
                    添加到计划
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {form.assets.length ? (
                form.assets.map((asset) => (
                  <div key={asset.ticker} className="rounded-2xl border border-white/10 bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-base text-white">{asset.ticker}</p>
                        <p className="text-xs text-slate-400">{asset.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAsset(asset.ticker)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/20"
                      >
                        <Trash2 size={14} />
                        删除
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
                        <span>权重</span>
                        <span className="font-mono text-white">{Math.round((Number(asset.weight) || 0) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={asset.weight}
                        onChange={(event) => updateAssetWeight(asset.ticker, Number(event.target.value))}
                        className="w-full accent-blue-400"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
                  还没有添加标的，请至少添加一个资产。
                </div>
              )}
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${isWeightValid ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
              当前总权重：{Math.round(totalWeight * 100)}%
              {!isWeightValid ? '，请调整到 100% 后才能保存。' : '，可以保存计划。'}
            </div>
          </div>
        </div>
      </div>

      <aside className="card p-5">
        <p className="label">计划概览</p>
        <h3 className="mt-2 text-xl font-semibold text-white">保存前检查</h3>
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p>预算模式：<span className="font-medium text-white">{isOpenEnded ? '无限定投' : '固定预算'}</span></p>
            <p>策略：<span className="font-medium text-white">{form.strategy}</span></p>
            <p>频率：<span className="font-medium text-white">{form.frequency === 'biweekly' ? '双周' : '月'}</span></p>
            {isOpenEnded ? (
              <p>每期目标：<span className="font-mono text-accent">{formatMoney(form.periodicTarget)}</span></p>
            ) : (
              <>
                <p>总预算：<span className="font-mono text-white">{formatMoney(form.totalBudget)}</span></p>
                <p>可投资金：<span className="font-mono text-accent">{formatMoney(deployableCash)}</span></p>
              </>
            )}
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p>标的数量：<span className="text-white">{form.assets.length}</span></p>
            <p>当前期数：<span className="text-white">第 {Number(form.currentPeriod) + 1} 期</span></p>
            <p>目标年化：<span className="text-white">{form.strategy === 'VA' ? `${Math.round((Number(form.targetAnnualReturn) || 0) * 100)}%` : '不适用'}</span></p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            <Save size={18} />
            保存计划
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-medium text-red-300 transition hover:bg-red-500/20"
          >
            <Trash2 size={18} />
            清除所有数据
          </button>
        </div>
      </aside>
    </section>
  )
}
