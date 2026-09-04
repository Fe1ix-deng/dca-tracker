import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { estimateTargetYield } from '../utils/yieldEstimator'
import { formatNumericInput, normalizeNumericInput } from '../utils/numericInput'
import { normalizeDate, normalizeSplitEvents, parseSplitRatio } from '../utils/stockSplits'
import { formatPrice, getPriceDecimals, normalizeMarket, normalizePriceInput } from '../utils/marketPrecision'
import BackupImportButton from './BackupImportButton'
import { useI18n } from '../i18n/index.jsx'

const strategyOptions = [
  { value: 'VA', label: 'VA定投' },
  { value: 'DCA', label: 'DCA定额' },
]

const marketOptions = [
  { value: 'US', label: '美股' },
  { value: 'CN', label: 'A股' },
]

const budgetModeOptions = [
  {
    value: 'fixed',
    label: '固定预算',
    description: '我有一笔闲钱，计划分 X 期投完。',
  },
  {
    value: 'open-ended',
    label: '无限定投',
    description: '我用每期收入的一部分持续投入，没有固定终点。',
  },
]

const frequencyOptions = [
  { value: 'biweekly', label: '双周' },
  { value: 'monthly', label: '月' },
]

const OPEN_ENDED_PLACEHOLDER_PERIODS = 9999
const MAX_RESERVE_RATIO = 0.3

export function validateSplitEventDraft(draft, tickers = []) {
  const ticker = String(draft?.ticker || '').trim().toUpperCase()
  const effectiveDate = normalizeDate(draft?.effectiveDate)
  const ratio = parseSplitRatio(draft?.ratio)
  if (!ticker || !tickers.map((item) => String(item).toUpperCase()).includes(ticker) || !effectiveDate || !ratio) {
    return null
  }

  return {
    ticker,
    effectiveDate,
    newShares: ratio.newShares,
    oldShares: ratio.oldShares,
  }
}

function clampReserveRatio(value) {
  return Math.min(MAX_RESERVE_RATIO, Math.max(0, Number(value) || 0))
}

function createDraftPlan() {
  return {
    id: '',
    name: '',
    strategy: 'VA',
    market: 'US',
    budgetMode: 'fixed',
    totalBudget: 50000,
    reserveRatio: 0.2,
    totalPeriods: 12,
    periodicTarget: 1000,
    currentPeriod: 0,
    frequency: 'monthly',
    targetAnnualReturn: 0.25,
    assets: [],
    splitEvents: [],
    createdAt: '',
  }
}

export function normalizeFormPlan(source) {
  const market = normalizeMarket(source?.market)
  const normalizedAssets = [...(source?.assets || [])].map((asset) => ({
    ...asset,
    currentShares: formatNumericInput(asset.initialSharesOriginal ?? asset.initialShares ?? asset.currentShares),
    initialAverageCost: formatNumericInput(asset.initialAverageCostOriginal ?? asset.initialAverageCost, {
      decimalPlaces: getPriceDecimals(market),
    }),
  }))
  const base = source ? { ...source, assets: normalizedAssets } : createDraftPlan()
  const budgetMode = base.budgetMode === 'open-ended' ? 'open-ended' : 'fixed'
  const hasPeriodicTarget = base.periodicTarget !== '' && base.periodicTarget !== null && base.periodicTarget !== undefined
  const hasTotalBudget = base.totalBudget !== '' && base.totalBudget !== null && base.totalBudget !== undefined
  const hasTotalPeriods = base.totalPeriods !== '' && base.totalPeriods !== null && base.totalPeriods !== undefined

  return {
    ...createDraftPlan(),
    ...base,
    market,
    splitEvents: normalizeSplitEvents(base.splitEvents),
    budgetMode,
    reserveRatio: budgetMode === 'open-ended' ? 0 : clampReserveRatio(base.reserveRatio),
    periodicTarget: hasPeriodicTarget ? formatNumericInput(base.periodicTarget) : '',
    totalBudget: hasTotalBudget ? formatNumericInput(base.totalBudget) : '',
    totalPeriods: budgetMode === 'open-ended'
      ? formatNumericInput(Math.max(Number(base.totalPeriods) || OPEN_ENDED_PLACEHOLDER_PERIODS, OPEN_ENDED_PLACEHOLDER_PERIODS), { integerOnly: true })
      : hasTotalPeriods
        ? formatNumericInput(Math.max(1, Number(base.totalPeriods) || 1), { integerOnly: true })
        : '',
  }
}

function createAssetDraft() {
  return {
    ticker: '',
    name: '',
    weight: 1,
    currentShares: '',
    initialAverageCost: '',
  }
}

function createSplitEventDraft() {
  return {
    ticker: '',
    effectiveDate: new Date().toISOString().slice(0, 10),
    ratio: '2:1',
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

function rebalanceWeights(assets = []) {
  if (!assets.length) {
    return []
  }

  const equalWeight = 1 / assets.length
  const rounded = assets.map((asset) => ({
    ...asset,
    weight: Number(equalWeight.toFixed(4)),
  }))
  const totalWeight = rounded.reduce((sum, asset) => sum + asset.weight, 0)
  const diff = Number((1 - totalWeight).toFixed(4))

  if (rounded.length) {
    rounded[rounded.length - 1].weight = Number((rounded[rounded.length - 1].weight + diff).toFixed(4))
  }

  return rounded
}

function getOptionCardClass(active) {
  return active
    ? 'subtle-panel border-accent/20 bg-accent/10 text-white'
    : 'subtle-panel text-textSoft'
}

export function getSavedReserveRatio(isOpenEnded, reserveRatio) {
  if (isOpenEnded) {
    return 0
  }

  return clampReserveRatio(reserveRatio ?? 0.2)
}

export default function Settings({ plan, onSavePlan, onNavigate, onClearAllData, onImportBackup, onDeletePlan }) {
  const { t } = useI18n()
  const [form, setForm] = useState(() => normalizeFormPlan(plan))
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [showSplitEvents, setShowSplitEvents] = useState(false)
  const [assetDraft, setAssetDraft] = useState(createAssetDraft())
  const [splitEventDraft, setSplitEventDraft] = useState(createSplitEventDraft())
  const [estimatedRange, setEstimatedRange] = useState(null)

  useEffect(() => {
    setForm(normalizeFormPlan(plan))
    setShowAssetForm(false)
    setShowSplitEvents(false)
    setAssetDraft(createAssetDraft())
    setSplitEventDraft(createSplitEventDraft())
    setEstimatedRange(null)
  }, [plan])

  const totalWeight = useMemo(
    () => form.assets.reduce((sum, asset) => sum + (Number(asset.weight) || 0), 0),
    [form.assets],
  )

  const isOpenEnded = form.budgetMode === 'open-ended'
  const totalBudgetValue = Number(form.totalBudget) || 0
  const totalPeriodsValue = Number(form.totalPeriods) || 0
  const periodicTargetValue = Number(form.periodicTarget) || 0
  const reserveRatioValue = clampReserveRatio(form.reserveRatio)
  const reservedCash = totalBudgetValue * reserveRatioValue
  const deployableCash = totalBudgetValue - reservedCash
  const isWeightValid = form.assets.length > 0 && Math.abs(totalWeight - 1) < 0.001
  const hasValidBudget = isOpenEnded ? periodicTargetValue >= 0 : totalBudgetValue > 0 && totalPeriodsValue > 0
  const canSave = form.name.trim() && hasValidBudget && isWeightValid

  const updateField = (key, value) => {
    setForm((current) => {
      const normalizedValue = key === 'periodicTarget' || key === 'totalBudget'
        ? normalizeNumericInput(value)
        : key === 'totalPeriods'
          ? normalizeNumericInput(value, { integerOnly: true })
          : key === 'reserveRatio'
            ? clampReserveRatio(value)
          : value
      const next = {
        ...current,
        [key]: normalizedValue,
      }

      if (key === 'budgetMode') {
        return {
          ...next,
          budgetMode: value,
          totalPeriods: value === 'open-ended'
            ? String(Math.max(Number(current.totalPeriods) || OPEN_ENDED_PLACEHOLDER_PERIODS, OPEN_ENDED_PLACEHOLDER_PERIODS))
            : String(Math.max(1, Number(current.totalPeriods) || 12)),
          totalBudget: value === 'open-ended' ? '0' : current.totalBudget,
        }
      }

      return next
    })
  }

  const saveAssetDraft = () => {
    if (!assetDraft.ticker.trim()) {
      return
    }

    setForm((current) => {
      const nextAssets = rebalanceWeights([
        ...current.assets,
        {
          ticker: assetDraft.ticker.trim().toUpperCase(),
          name: assetDraft.name.trim() || assetDraft.ticker.trim().toUpperCase(),
          weight: Number(assetDraft.weight) || 0,
          currentShares: Number(assetDraft.currentShares) || 0,
          initialShares: Number(assetDraft.currentShares) || 0,
          initialAverageCost: Number(normalizePriceInput(assetDraft.initialAverageCost, current.market)) || 0,
        },
      ])

      return {
        ...current,
        assets: nextAssets,
      }
    })

    setAssetDraft(createAssetDraft())
    setShowAssetForm(false)
  }

  const removeAsset = (ticker) => {
    setForm((current) => ({
      ...current,
      assets: rebalanceWeights(current.assets.filter((asset) => asset.ticker !== ticker)),
      splitEvents: (current.splitEvents || []).filter((event) => event.ticker !== ticker),
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

  const updateAssetCurrentShares = (ticker, currentShares) => {
    setForm((current) => ({
      ...current,
      assets: current.assets.map((asset) =>
        asset.ticker === ticker
          ? {
              ...asset,
              currentShares,
            }
          : asset,
      ),
    }))
  }

  const updateAssetInitialAverageCost = (ticker, initialAverageCost) => {
    setForm((current) => ({
      ...current,
      assets: current.assets.map((asset) =>
        asset.ticker === ticker
          ? {
              ...asset,
              initialAverageCost,
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

  const addSplitEvent = () => {
    const event = validateSplitEventDraft(splitEventDraft, form.assets.map((asset) => asset.ticker))
    if (!event) return

    setForm((current) => ({
      ...current,
      splitEvents: normalizeSplitEvents([
        ...(current.splitEvents || []),
        { ...event, id: `split-${Date.now()}`, createdAt: new Date().toISOString() },
      ]),
    }))
    setSplitEventDraft(createSplitEventDraft())
  }

  const removeSplitEvent = (eventId) => {
    setForm((current) => ({
      ...current,
      splitEvents: (current.splitEvents || []).filter((event) => event.id !== eventId),
    }))
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
      totalBudget: isOpenEnded ? 0 : totalBudgetValue,
      reserveRatio: getSavedReserveRatio(isOpenEnded, form.reserveRatio),
      totalPeriods: isOpenEnded
        ? Math.max(totalPeriodsValue || OPEN_ENDED_PLACEHOLDER_PERIODS, OPEN_ENDED_PLACEHOLDER_PERIODS)
        : totalPeriodsValue,
      periodicTarget: periodicTargetValue,
      currentPeriod: Number(form.currentPeriod) || 0,
      targetAnnualReturn: Number(form.targetAnnualReturn) || 0.25,
      splitEvents: normalizeSplitEvents(form.splitEvents),
      createdAt: form.createdAt || new Date().toISOString(),
      assets: form.assets.map((asset) => ({
        ...asset,
        ticker: asset.ticker.trim().toUpperCase(),
        name: asset.name?.trim() || asset.ticker.trim().toUpperCase(),
        weight: Number(asset.weight) || 0,
        currentShares: Number(asset.currentShares) || 0,
        initialShares: Number(asset.currentShares) || 0,
        initialSharesOriginal: Number(asset.currentShares) || 0,
        initialAverageCost: Number(normalizePriceInput(asset.initialAverageCost, form.market)) || 0,
        initialAverageCostOriginal: Number(normalizePriceInput(asset.initialAverageCost, form.market)) || 0,
      })),
    }

    onSavePlan(nextPlan)
    onNavigate('dashboard')
  }

  const handleCreateNew = () => {
    setForm({
      ...createDraftPlan(),
      totalBudget: '50000',
      totalPeriods: '12',
      periodicTarget: '1000',
    })
    setShowAssetForm(false)
    setShowSplitEvents(false)
    setAssetDraft(createAssetDraft())
    setSplitEventDraft(createSplitEventDraft())
    setEstimatedRange(null)
  }

  const handleDeletePlan = () => {
    if (!plan?.id) {
      return
    }

    const confirmed = window.confirm(t('确认删除计划“{name}”？该计划及其历史记录将被永久删除，无法恢复。', {
      name: plan.name || t('未命名计划'),
    }))
    if (!confirmed) {
      return
    }

    onDeletePlan?.(plan.id)
  }

  const handleClearAll = () => {
    const confirmed = window.confirm(t('此操作将清除所有计划和历史记录，无法恢复，确认继续？'))
    if (!confirmed) {
      return
    }

    onClearAllData?.()
    setForm({
      ...createDraftPlan(),
      totalBudget: '50000',
      totalPeriods: '12',
      periodicTarget: '1000',
    })
    setShowAssetForm(false)
    setShowSplitEvents(false)
    setAssetDraft(createAssetDraft())
    setSplitEventDraft(createSplitEventDraft())
    setEstimatedRange(null)
    onNavigate('settings')
  }

  return (
    <section className="console-grid xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="label">Plan Configuration</p>
            <h2 className="section-title">{t('计划设置')}</h2>
            <p className="muted-copy mt-3 max-w-2xl">
              {t('配置节奏、预算和资产权重。右侧检查面板会实时提示当前计划是否可以保存。')}
            </p>
          </div>

          {plan ? (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => setForm(normalizeFormPlan(plan))}
                className="control-button"
              >
                {t('撤销修改')}
              </button>
              <button
                type="button"
                onClick={handleCreateNew}
                className="control-button"
              >
                {t('填写新计划')}
              </button>
              <button
                type="button"
                onClick={handleDeletePlan}
                className="control-button-danger"
                aria-label={t('删除当前计划')}
                title={t('删除当前计划')}
              >
                <Trash2 size={16} aria-hidden="true" />
                {t('删除当前计划')}
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-5">
          <div className="settings-section">
            <div className="settings-section-header">
              <div>
                <p className="mini-kicker">{t('计划身份')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('给这套执行参数一个清晰名称。')}</p>
              </div>
            </div>
            <label className="mt-4 block space-y-2">
              <span className="text-sm text-muted-foreground">{t('名称')}</span>
              <input
                type="text"
                value={form.name}
                placeholder={t('例如：2026 美股 VA 定投')}
                onChange={(event) => updateField('name', event.target.value)}
                className="surface-input"
              />
            </label>
            <label className="mt-4 block space-y-2">
              <span className="text-sm text-muted-foreground">{t('市场')}</span>
              <select
                value={form.market}
                onChange={(event) => updateField('market', event.target.value)}
                className="surface-select"
              >
                {marketOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)} ({option.value})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <div>
                <p className="mini-kicker">{t('预算模式')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('选择固定预算或长期持续投入。')}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {budgetModeOptions.map((option) => (
                <label key={option.value} className={`p-4 ${getOptionCardClass(form.budgetMode === option.value)}`}>
                  <input
                    type="radio"
                    name="budgetMode"
                    value={option.value}
                    checked={form.budgetMode === option.value}
                    onChange={() => updateField('budgetMode', option.value)}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium text-white">{t(option.label)}</div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{t(option.description)}</p>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <div>
                <p className="mini-kicker">{t('策略类型')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('VA 更强调路径控制，DCA 更强调稳定执行。')}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {strategyOptions.map((option) => (
                <label key={option.value} className={`p-4 ${getOptionCardClass(form.strategy === option.value)}`}>
                  <input
                    type="radio"
                    name="strategy"
                    value={option.value}
                    checked={form.strategy === option.value}
                    onChange={() => updateField('strategy', option.value)}
                    className="sr-only"
                  />
                  <div className="text-sm font-medium text-white">{t(option.label)}</div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {option.value === 'VA'
                      ? t('根据市值与目标的差距决定每期投入多少，更适合严格控制执行路径。')
                      : t('每期固定投入同样金额，执行简单，适合更长期的机械化定投。')}
                  </p>
                </label>
              ))}
            </div>
          </div>

          {isOpenEnded ? (
            <div className="settings-section">
              <p className="mini-kicker">{t('长期执行预算')}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                <label className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t('每期计划投入金额（美元）')}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.periodicTarget}
                    onChange={(event) => updateField('periodicTarget', event.target.value)}
                    onBlur={() => updateField('periodicTarget', formatNumericInput(form.periodicTarget))}
                    className="surface-input financial-input"
                  />
                </label>
                <div className="surface-stat">
                  <p className="mini-kicker">{t('当前目标')}</p>
                  <p className="mt-3 data-value text-xl">{formatMoney(form.periodicTarget)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{t('仅用于建议，不做硬性限制')}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="settings-section">
              <p className="mini-kicker">{t('预算与周期')}</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t('总预算（美元）')}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.totalBudget}
                    onChange={(event) => updateField('totalBudget', event.target.value)}
                    onBlur={() => updateField('totalBudget', formatNumericInput(form.totalBudget))}
                    className="surface-input financial-input"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t('总期数')}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.totalPeriods}
                    onChange={(event) => updateField('totalPeriods', event.target.value)}
                    onBlur={() => updateField('totalPeriods', formatNumericInput(form.totalPeriods, { integerOnly: true }))}
                    className="surface-input financial-input"
                  />
                </label>
              </div>

              <div className="mt-4 subtle-panel p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{t('保留现金比例')}</span>
                  <span className="data-value">{Math.round(reserveRatioValue * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.3"
                  step="0.01"
                  value={reserveRatioValue}
                  onChange={(event) => updateField('reserveRatio', Number(event.target.value))}
                  className="mt-4 w-full accent-accent"
                />
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="surface-stat">
                    <p className="mini-kicker">{t('保留现金')}</p>
                    <p className="mt-3 data-value text-lg">{formatMoney(reservedCash)}</p>
                  </div>
                  <div className="surface-stat">
                    <p className="mini-kicker">{t('可投资金')}</p>
                    <p className="mt-3 data-value text-lg">{formatMoney(deployableCash)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
            <div className="settings-section">
              <p className="mini-kicker">{t('执行节奏')}</p>
              <label className="mt-4 block space-y-2">
                <span className="text-sm text-muted-foreground">{t('定投频率')}</span>
                <select
                  value={form.frequency}
                  onChange={(event) => updateField('frequency', event.target.value)}
                  className="surface-select"
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {form.strategy === 'VA' ? (
              <div className="settings-section">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="mini-kicker">{t('目标年化收益率')}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{t('你可以手动拖动，也可以基于组合历史收益自动测算。')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleEstimateYield}
                    className="control-button"
                  >
                    <Sparkles size={14} />
                    {t('自动测算')}
                  </button>
                </div>

                <div className="mt-4 subtle-row">
                  <span>{t('当前建议值')}</span>
                  <span className="data-value">{formatPercent(form.targetAnnualReturn)}</span>
                </div>

                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.01"
                  value={form.targetAnnualReturn}
                  onChange={(event) => updateField('targetAnnualReturn', Number(event.target.value))}
                  className="mt-4 w-full accent-accent"
                />

                {estimatedRange ? (
                  <div className="mt-4 subtle-panel p-4 text-xs leading-6 text-muted-foreground">
                    <p>
                      {t('建议范围')} <span className="data-subtle">{formatPercent(estimatedRange.minYield)}</span> ~ <span className="data-subtle">{formatPercent(estimatedRange.maxYield)}</span>，{t('可根据风险偏好微调。')}
                    </p>
                    <p className="mt-2">
                      {t('数据基于各标的历史表现估算，不代表未来收益，TSLA / IBIT 等高波动标的仅作参考。')}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="settings-section">
                <p className="mini-kicker">{t('目标年化收益率')}</p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {t('DCA 策略不需要设置目标年化收益率，重点是固定节奏与长期执行。')}
                </p>
              </div>
            )}
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <div>
                <p className="mini-kicker">{t('资产配置')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('权重之和必须等于 100%，数字和 ticker 使用等宽排版。')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetForm((current) => !current)}
                className="control-button"
              >
                <Plus size={16} />
                {t('添加标的')}
              </button>
            </div>

            {showAssetForm ? (
              <div className="mt-4 subtle-panel p-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-sm text-muted-foreground">Ticker</span>
                    <input
                      type="text"
                      value={assetDraft.ticker}
                      onChange={(event) => setAssetDraft((current) => ({ ...current, ticker: event.target.value }))}
                      className="surface-input financial-input"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-muted-foreground">{t('显示名称')}</span>
                    <input
                      type="text"
                      value={assetDraft.name}
                      onChange={(event) => setAssetDraft((current) => ({ ...current, name: event.target.value }))}
                      className="surface-input"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-muted-foreground">{t('计划开始前持仓股数')}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={assetDraft.currentShares}
                      placeholder="0"
                      onChange={(event) => setAssetDraft((current) => ({ ...current, currentShares: normalizeNumericInput(event.target.value) }))}
                      onBlur={() => setAssetDraft((current) => ({ ...current, currentShares: formatNumericInput(current.currentShares) }))}
                      className="surface-input financial-input"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm text-muted-foreground">{t('计划开始前持仓均价')}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={assetDraft.initialAverageCost}
                      placeholder="0"
                      onChange={(event) => setAssetDraft((current) => ({ ...current, initialAverageCost: normalizePriceInput(event.target.value, form.market) }))}
                      onBlur={() => setAssetDraft((current) => ({
                        ...current,
                        initialAverageCost: current.initialAverageCost === '' ? '' : formatPrice(current.initialAverageCost, form.market),
                      }))}
                      className="surface-input financial-input"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-muted-foreground">{t('权重')}</span>
                    <span className="data-value">{Math.round((Number(assetDraft.weight) || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.01"
                    value={assetDraft.weight}
                    onChange={(event) => setAssetDraft((current) => ({ ...current, weight: Number(event.target.value) }))}
                    className="mt-4 w-full accent-accent"
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={saveAssetDraft}
                    className="control-button-primary"
                  >
                    {t('添加到计划')}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              {form.assets.length ? (
                form.assets.map((asset) => (
                  <div key={asset.ticker} className="subtle-panel p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="data-value text-base">{asset.ticker}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{asset.name}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAsset(asset.ticker)}
                        className="control-button-danger"
                      >
                        <Trash2 size={14} />
                        {t('删除')}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px_240px]">
                      <div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-muted-foreground">{t('权重')}</span>
                          <span className="data-value">{Math.round((Number(asset.weight) || 0) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={asset.weight}
                          onChange={(event) => updateAssetWeight(asset.ticker, Number(event.target.value))}
                          className="mt-4 w-full accent-accent"
                        />
                      </div>

                      <label className="space-y-2">
                        <span className="text-sm text-muted-foreground">{t('计划开始前持仓股数')}</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={asset.currentShares}
                          placeholder="0"
                          onChange={(event) => updateAssetCurrentShares(asset.ticker, normalizeNumericInput(event.target.value))}
                          onBlur={() => updateAssetCurrentShares(asset.ticker, formatNumericInput(asset.currentShares))}
                          className="surface-input financial-input"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm text-muted-foreground">{t('计划开始前持仓均价')}</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={asset.initialAverageCost}
                          placeholder="0"
                          onChange={(event) => updateAssetInitialAverageCost(asset.ticker, normalizePriceInput(event.target.value, form.market))}
                          onBlur={() => updateAssetInitialAverageCost(
                            asset.ticker,
                            asset.initialAverageCost === '' ? '' : formatPrice(asset.initialAverageCost, form.market),
                          )}
                          className="surface-input financial-input"
                        />
                      </label>
                    </div>
                  </div>
                ))
              ) : (
                <div className="subtle-panel px-4 py-6 text-center text-sm text-muted-foreground">
                  {t('还没有添加标的，请至少添加一个资产。')}
                </div>
              )}
            </div>

            <div className={`settings-weight-status mt-4 rounded-md border px-4 py-3 ${isWeightValid ? 'border-positive/30 bg-positive/10 text-positive' : 'border-warning/30 bg-warning/10 text-warning'}`}>
              <span>{t('当前总权重：')}</span>
              <span className="data-value">{Math.round(totalWeight * 100)}%</span>
              <span>{!isWeightValid ? t('，请调整到 100% 后才能保存。') : t('，可以保存当前计划。')}</span>
            </div>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <button
                type="button"
                onClick={() => setShowSplitEvents((current) => !current)}
                aria-expanded={showSplitEvents}
                aria-controls="split-events-panel"
                className="flex min-w-0 flex-1 items-start justify-between gap-4 text-left"
              >
                <div>
                <p className="mini-kicker">{t('拆股与合股')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('按生效日记录比例，历史股数和价格会自动换算；小数股会保留。')}</p>
                </div>
                {showSplitEvents ? <ChevronUp size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" /> : <ChevronDown size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
              </button>
            </div>

            {showSplitEvents ? <div id="split-events-panel">
            <div className="mt-4 rounded-md border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-textSoft">
              {t('已加入草稿，保存计划后生效。')}
            </div>

            <div className="mt-3 subtle-panel p-4">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_160px_auto] md:items-end">
                <label className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t('标的')}</span>
                  <select
                    value={splitEventDraft.ticker}
                    onChange={(event) => setSplitEventDraft((current) => ({ ...current, ticker: event.target.value }))}
                    className="surface-input"
                  >
                    <option value="">{t('选择标的')}</option>
                    {form.assets.map((asset) => <option key={asset.ticker} value={asset.ticker}>{asset.ticker}</option>)}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t('生效日期')}</span>
                  <input
                    type="date"
                    value={splitEventDraft.effectiveDate}
                    onChange={(event) => setSplitEventDraft((current) => ({ ...current, effectiveDate: event.target.value }))}
                    className="surface-input"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t('比例（新:旧）')}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={splitEventDraft.ratio}
                    placeholder="例如 2:1"
                    onChange={(event) => setSplitEventDraft((current) => ({ ...current, ratio: event.target.value }))}
                    className="surface-input financial-input"
                  />
                </label>
                <button type="button" onClick={addSplitEvent} className="control-button-primary">
                  <Plus size={16} />
                  {t('记录事件')}
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {(form.splitEvents || []).length ? (form.splitEvents || []).map((event) => (
                <div key={event.id} className="subtle-row rounded-md border border-white/10 px-3 py-3 text-sm">
                  <span className="data-value">{event.ticker}</span>
                  <span className="text-muted-foreground">{event.effectiveDate}</span>
                  <span className="data-value">{event.newShares}:{event.oldShares}</span>
                  <button type="button" onClick={() => removeSplitEvent(event.id)} className="control-button-danger" aria-label={t('删除 {ticker} 拆股事件', { ticker: event.ticker })}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">{t('尚未记录拆股或合股事件。')}</p>
              )}
            </div>
            </div> : null}
          </div>
        </div>
      </div>

      <aside className="card h-fit p-5 xl:sticky xl:top-5">
        <p className="label">Review</p>
        <h3 className="section-title">{t('保存前检查')}</h3>

        <div className="mt-5 grid gap-4">
          <div className="subtle-panel p-4">
            <p className="mini-kicker">{t('计划概览')}</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="subtle-row">
                <span>{t('当前计划')}</span>
                <span className="truncate pl-4 text-right text-white">{form.name || t('未命名计划')}</span>
              </div>
              <div className="subtle-row">
                <span>{t('预算模式')}</span>
                <span className="text-white">{isOpenEnded ? t('无限定投') : t('固定预算')}</span>
              </div>
              <div className="subtle-row">
                <span>{t('策略')}</span>
                <span className="text-white">{form.strategy}</span>
              </div>
              <div className="subtle-row">
                <span>{t('频率')}</span>
                <span className="text-white">{form.frequency === 'biweekly' ? t('双周') : t('月')}</span>
              </div>
            </div>
          </div>

          <div className="subtle-panel p-4">
            <p className="mini-kicker">{t('资金检查')}</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {isOpenEnded ? (
                <div className="subtle-row">
                  <span>{t('每期目标')}</span>
                  <span className="data-subtle">{formatMoney(form.periodicTarget)}</span>
                </div>
              ) : (
                <>
                  <div className="subtle-row">
                    <span>{t('总预算')}</span>
                    <span className="data-subtle">{formatMoney(form.totalBudget)}</span>
                  </div>
                  <div className="subtle-row">
                    <span>{t('可投资金')}</span>
                    <span className="data-subtle">{formatMoney(deployableCash)}</span>
                  </div>
                  <div className="subtle-row">
                    <span>{t('保留现金')}</span>
                    <span className="data-subtle">{formatMoney(reservedCash)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="subtle-panel p-4">
            <p className="mini-kicker">{t('结构检查')}</p>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              <div className="subtle-row">
                <span>{t('标的数量')}</span>
                <span className="data-subtle">{form.assets.length}</span>
              </div>
              <div className="subtle-row">
                <span>{t('当前期数')}</span>
                <span className="data-subtle">{t('第 {period} 期', { period: Number(form.currentPeriod) + 1 })}</span>
              </div>
              <div className="subtle-row">
                <span>{t('目标年化')}</span>
                <span className="data-subtle">{form.strategy === 'VA' ? `${Math.round((Number(form.targetAnnualReturn) || 0) * 100)}%` : t('不适用')}</span>
              </div>
              <div className="subtle-row">
                <span>{t('权重校验')}</span>
                <span className={isWeightValid ? 'text-positive' : 'text-warning'}>
                  {Math.round(totalWeight * 100)}%
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="control-button-primary w-full disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-white/[0.02] disabled:text-muted"
          >
            <Save size={18} />
            {t('保存当前计划')}
          </button>

          <BackupImportButton onImportBackup={onImportBackup} className="control-button w-full" />

          <button
            type="button"
            onClick={handleClearAll}
            className="control-button-danger w-full"
          >
            <Trash2 size={18} />
            {t('清除所有数据')}
          </button>
        </div>
      </aside>
    </section>
  )
}
