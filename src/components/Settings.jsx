import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Save, Sparkles, Trash2 } from 'lucide-react'
import { estimateTargetYield } from '../utils/yieldEstimator'
import { normalizeDate, normalizeSplitEvents, parseSplitRatio } from '../utils/stockSplits'
import { formatMoney } from '../utils/money'
import BackupImportButton from './BackupImportButton'
import { useI18n } from '../i18n/index.jsx'
import { createUuid } from '../utils/ids'
import { validatePlanDraft } from '../utils/planValidation'
import { inspectAssetIntegrity, validateAssetIdentityChange } from '../utils/assetIntegrity'
import { canonicalTicker, WEIGHT_SUM_TOLERANCE } from '../utils/planConstraints'
import PlanValidationSummary, { errorText } from './PlanValidationSummary'

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
    description: '固定总额，分期投入',
  },
  {
    value: 'open-ended',
    label: '无限定投',
    description: '持续投入，不设终点',
  },
]

const frequencyOptions = [
  { value: 'biweekly', label: '双周' },
  { value: 'monthly', label: '月' },
]

import { MAX_RESERVE_RATIO, draftNumber } from '../utils/planConstraints'

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
    id: createUuid(),
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
    targetAnnualReturn: 0,
    assets: [],
    splitEvents: [],
    createdAt: '',
  }
}

export function normalizeFormPlan(source) {
  const base = source ? { ...createDraftPlan(), ...source } : createDraftPlan()
  const display = value => value === undefined || value === null ? '' : String(value)
  return {
    ...base,
    assets: (Array.isArray(base.assets) ? base.assets : []).map(asset => ({
      ...asset,
      currentShares: display(asset?.initialSharesOriginal ?? asset?.initialShares ?? asset?.currentShares),
      initialAverageCost: display(asset?.initialAverageCostOriginal ?? asset?.initialAverageCost),
    })),
    splitEvents: Array.isArray(base.splitEvents) ? base.splitEvents : [],
    periodicTarget: String(base.periodicTarget ?? ''),
    totalBudget: String(base.totalBudget ?? ''),
    totalPeriods: String(base.totalPeriods ?? ''),
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


function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}

function generateId() {
  return createUuid()
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

export default function Settings({ plan, plans = [], records = [], assetIntegrity, persistenceError, onSavePlan, onNavigate, onClearAllData, onImportBackup, onDeletePlan }) {
  const { t } = useI18n()
  const rowForm = source => {
    const normalized = normalizeFormPlan(source)
    return { ...normalized, assets: normalized.assets.map(asset => ({ ...asset, draftRowId: createUuid() })) }
  }
  const [form, setForm] = useState(() => rowForm(plan))
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [serverErrors, setServerErrors] = useState([])
  const [assetErrors, setAssetErrors] = useState([])
  const [focusRequest, setFocusRequest] = useState(null)
  const [editingPlanId, setEditingPlanId] = useState(plan?.id || null)
  const rootRef = useRef(null), submissionRef = useRef(0), pendingRef = useRef(false)
  const submittedIdRef = useRef(null)
  useEffect(() => () => { submissionRef.current += 1 }, [])
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [showSplitEvents, setShowSplitEvents] = useState(false)
  const [assetDraft, setAssetDraft] = useState(createAssetDraft())
  const [splitEventDraft, setSplitEventDraft] = useState(createSplitEventDraft())
  const [estimatedRange, setEstimatedRange] = useState(null)

  useEffect(() => {
    const nextId = plan?.id || null
    const ownPublication = pendingRef.current && submittedIdRef.current === nextId
    if (ownPublication) return
    submissionRef.current += 1
    pendingRef.current = false
    setIsSaving(false)
    setHasSubmitted(false)
    setSaveError('')
    setServerErrors([])
    setAssetErrors([])
    setFocusRequest(null)
    setEditingPlanId(plan?.id || null)
    setForm(rowForm(plan))
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
  const reserveRatioValue = clampReserveRatio(form.reserveRatio)
  const reservedCash = totalBudgetValue * reserveRatioValue
  const deployableCash = totalBudgetValue - reservedCash
  const isWeightValid = form.assets.length > 0 && Math.abs(totalWeight - 1) <= WEIGHT_SUM_TOLERANCE
  const original = editingPlanId ? plan : null
  const integrity = assetIntegrity || inspectAssetIntegrity({ plans: plan ? [plan] : [], records }).byPlanId[plan?.id]
  const validation = validatePlanDraft(form, { existingPlanIds: plans.map(p => p.id), editingPlanId, planRecordCount: records.filter(r => r.planId === editingPlanId).length, assetIntegrity: editingPlanId ? integrity : null })
  const errors = hasSubmitted ? [...validation.errors, ...validateAssetIdentityChange(original, form, records), ...serverErrors] : []
  const isProtected = asset => (editingPlanId && integrity?.protectedTickers?.has(canonicalTicker(asset.ticker))) || (form.splitEvents || []).some(event => canonicalTicker(event.ticker) === canonicalTicker(asset.ticker)) || Boolean(editingPlanId && integrity?.needsRepair)
  const focusField = field => {
    const target = [...(rootRef.current?.querySelectorAll('[data-field]') || [])].find(node => node.dataset.field === field)
      || rootRef.current?.querySelector('[data-field="form"]')
    target?.focus({ preventScroll: true })
    target?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }
  useEffect(() => { if (focusRequest) focusField(focusRequest.field) }, [focusRequest])
  const requestFocus = field => setFocusRequest({ field, tick: Date.now() })
  const fieldProps = field => ({
    'data-field': field, id: 'plan-' + field, 'aria-label': ({name:t('名称'),totalBudget:t('总预算（美元）'),totalPeriods:t('总期数'),periodicTarget:t('每期计划投入金额（美元）'),market:t('市场'),frequency:t('定投频率')})[field],
    'aria-invalid': errors.some(error => error.field === field) || undefined,
    'aria-describedby': errors.some(error => error.field === field) ? 'error-' + field : undefined,
  })
  const parameterProps = field => { const props = fieldProps(field); const { id, 'data-field': dataField, ...rest } = props; return rest }
  const nearbyError = field => errors.some(error => error.field === field) ? <p id={'error-' + field} className="mt-2 text-sm text-warning">{errors.filter(error => error.field === field).map(error => errorText(error, t)).join(' ')}</p> : null
  const updateField = (key, value) => {
    setServerErrors([])
    setForm(current => ({ ...current, [key]: value }))
  }
  const saveAssetDraft = () => {
    const candidate = { ...form, assets: [...form.assets, assetDraft] }
    const prefix = 'assets[' + form.assets.length + ']'
    const result = validatePlanDraft(candidate)
    const localErrors = result.errors.filter(error => error.field.startsWith(prefix) || (error.field === 'assets' && form.assets.length >= 100))
    if (localErrors.length) { setAssetErrors(localErrors); return }
    setForm(current => ({ ...current, assets: [...current.assets, { ...assetDraft, ticker: canonicalTicker(assetDraft.ticker), name: assetDraft.name.trim() || canonicalTicker(assetDraft.ticker), draftRowId: createUuid() }] }))
    setAssetErrors([])
    setAssetDraft(createAssetDraft())
    setShowAssetForm(false)
  }
  const removeAsset = rowId => {
    const asset = form.assets.find(item => item.draftRowId === rowId)
    if (!asset || isProtected(asset)) return
    setServerErrors([])
    setForm(current => ({ ...current, assets: current.assets.filter(item => item.draftRowId !== rowId) }))
  }
  const updateAsset = (rowId, field, value) => {
    setServerErrors([])
    setForm(current => ({ ...current, assets: current.assets.map(asset => asset.draftRowId === rowId ? { ...asset, [field]: value } : asset) }))
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
        { ...event, id: createUuid(), createdAt: new Date().toISOString() },
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

  const handleSave = async () => {
    if (pendingRef.current) return
    setHasSubmitted(true)
    setServerErrors([])
    const allErrors = [...validation.errors, ...validateAssetIdentityChange(original, form, records)]
    if (allErrors.length) { requestFocus(allErrors[0].field); return }
    const nextPlan = {
      ...form, id: form.id || generateId(), name: form.name.trim(),
      totalBudget: isOpenEnded ? 0 : Number(form.totalBudget),
      reserveRatio: isOpenEnded ? 0 : Number(form.reserveRatio),
      totalPeriods: Number(form.totalPeriods),
      periodicTarget: isOpenEnded ? Number(form.periodicTarget) : Number.isFinite(draftNumber(form.periodicTarget)) ? Number(form.periodicTarget) : 0,
      currentPeriod: Number(form.currentPeriod),
      targetAnnualReturn: form.strategy === 'VA' ? Number(form.targetAnnualReturn) : 0,
      createdAt: form.createdAt || new Date().toISOString(),
      assets: form.assets.map(({ draftRowId, ...asset }) => ({ ...asset,
        ticker: canonicalTicker(asset.ticker), name: asset.name?.trim() || canonicalTicker(asset.ticker),
        weight: Number(asset.weight), currentShares: draftNumber(asset.currentShares, true),
        initialShares: draftNumber(asset.currentShares, true), initialSharesOriginal: draftNumber(asset.currentShares, true),
        initialAverageCost: draftNumber(asset.initialAverageCost, true), initialAverageCostOriginal: draftNumber(asset.initialAverageCost, true),
      })),
    }
    const token = ++submissionRef.current
    pendingRef.current = true
    submittedIdRef.current = nextPlan.id
    setIsSaving(true)
    let result
    try { result = await onSavePlan?.(nextPlan, { editingPlanId }) }
    catch (error) { result = { ok: false, error: error?.message || t('保存失败，请重试。') } }
    if (token !== submissionRef.current) return
    pendingRef.current = false
    setIsSaving(false)
    if (result?.ok === true) { setSaveError(''); onNavigate?.('dashboard'); return }
    setSaveError(result?.error || t('保存失败：未收到成功确认，草稿已保留。'))
    setServerErrors(result?.errors || [])
    requestFocus('saveError')
  }

  const handleCreateNew = () => {
    submissionRef.current += 1
    setEditingPlanId(null)
    setHasSubmitted(false)
    setServerErrors([])
    setAssetErrors([])
    setSaveError('')
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
    <section ref={rootRef} aria-busy={isSaving} className="console-grid xl:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
      <div aria-live="polite" aria-atomic="true" className="sr-only">{isSaving ? t('保存中') : saveError ? saveError : errors.length ? t('有 {count} 项错误：{first}', {count: errors.length, first: errorText(errors[0], t)}) : hasSubmitted ? t('表单校验已通过。') : ''}</div>
      <fieldset disabled={isSaving} className="contents">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">

            <h2 className="section-title">{t('计划设置')}</h2>

          </div>

          {plan ? (
            <div className="flex w-full flex-wrap gap-2 sm:w-auto">
              <button
                type="button"
                onClick={() => { setForm(rowForm(plan)); setEditingPlanId(plan.id); setHasSubmitted(false); setServerErrors([]) }}
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
              </div>
            </div>
            <label className="mt-4 block space-y-2">
              <span className="text-sm text-muted-foreground">{t('名称')}</span>
              <input
                type="text"
                {...fieldProps('name')} value={form.name}
                placeholder={t('例如：2026 美股 VA 定投')}
                onChange={(event) => updateField('name', event.target.value)}
                className="surface-input"
              />
            {nearbyError('name')}</label>
            <label className="mt-4 block space-y-2">
              <span className="text-sm text-muted-foreground">{t('市场')}</span>
              <select
                {...fieldProps('market')} value={form.market}
                onChange={(event) => updateField('market', event.target.value)}
                className="surface-select"
              >
                {marketOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            {nearbyError('market')}</label>
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <div>
                <p className="mini-kicker">{t('预算模式')}</p>
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
                      ? t('按目标市值补足差额')
                      : t('每期投入固定金额')}
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
                    {...fieldProps('periodicTarget')} value={form.periodicTarget}
                    onChange={(event) => updateField('periodicTarget', event.target.value)}
                    className="surface-input financial-input"
                  />
                {nearbyError('periodicTarget')}</label>
                <div className="surface-stat">
                  <p className="mini-kicker">{t('当前目标')}</p>
                  <p className="mt-3 data-value text-xl">{formatMoney(form.periodicTarget, plan)}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{t('仅用于建议，不做硬性限制')}</p>
                  {draftNumber(form.periodicTarget) === 0 ? <p className="mt-2 text-xs text-muted-foreground">{t('本期目标投入为 0，可自行决定实际投入。')}</p> : null}
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
                    {...fieldProps('totalBudget')} value={form.totalBudget}
                    onChange={(event) => updateField('totalBudget', event.target.value)}
                    className="surface-input financial-input"
                  />
                {nearbyError('totalBudget')}</label>

                <label className="space-y-2">
                  <span className="text-sm text-muted-foreground">{t('总期数')}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    {...fieldProps('totalPeriods')} value={form.totalPeriods}
                    onChange={(event) => updateField('totalPeriods', event.target.value)}
                    className="surface-input financial-input"
                  />
                {nearbyError('totalPeriods')}</label>
              </div>

              <div className="mt-4 subtle-panel p-4">
                <div className="flex items-center justify-between gap-4">
                  <label htmlFor="reserve-ratio-range" className="text-sm text-muted-foreground">{t('保留现金比例')}</label>
                  <output htmlFor="reserve-ratio-range" className="data-value">{Math.round(reserveRatioValue * 100)}%</output>
                </div>
                <input
                  id="reserve-ratio-range"
                  type="range"
                  min="0"
                  max="0.3"
                  step="0.01"
                  value={reserveRatioValue}
                  aria-label={t('保留现金比例')}
                  aria-valuetext={`${Math.round(reserveRatioValue * 100)}%`}
                  onChange={(event) => updateField('reserveRatio', Number(event.target.value))}
                  className="mt-4 w-full accent-accent"
                />
                <label className="mt-3 block text-sm">{t('保留现金比例（小数）')}<input type="text" inputMode="decimal" {...fieldProps('reserveRatio')} value={String(form.reserveRatio)} onChange={event => updateField('reserveRatio', event.target.value)} className="surface-input financial-input mt-2" /></label>
                {nearbyError('reserveRatio')}
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="surface-stat">
                    <p className="mini-kicker">{t('保留现金')}</p>
                    <p className="mt-3 data-value text-lg">{formatMoney(reservedCash, plan)}</p>
                  </div>
                  <div className="surface-stat">
                    <p className="mini-kicker">{t('可投资金')}</p>
                    <p className="mt-3 data-value text-lg">{formatMoney(deployableCash, plan)}</p>
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
                  {...fieldProps('frequency')} value={form.frequency}
                  onChange={(event) => updateField('frequency', event.target.value)}
                  className="surface-select"
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              {nearbyError('frequency')}</label>
            </div>

            {form.strategy === 'VA' ? (
              <div className="settings-section">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <label htmlFor="target-return-range" className="mini-kicker">{t('目标年化收益率')}</label>
                    <p className="mt-2 text-sm text-muted-foreground">{t('仅作为 VA 目标路径参数，不是收益预测、投资建议或收益承诺。')}</p>
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
                  <output htmlFor="target-return-range" className="data-value">{formatPercent(form.targetAnnualReturn)}</output>
                </div>

                <input
                  id="target-return-range"
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  {...parameterProps('targetAnnualReturn')} value={Math.min(0.5, Math.max(0, Number(form.targetAnnualReturn) || 0))}
                  aria-label={t('目标年化收益率')}
                  aria-valuetext={formatPercent(form.targetAnnualReturn)}
                  onChange={(event) => updateField('targetAnnualReturn', Number(event.target.value))}
                  className="mt-4 w-full accent-accent"
                />
                <label className="mt-3 block text-sm">{t('目标年化收益率（小数）')}<input type="text" inputMode="decimal" {...fieldProps('targetAnnualReturn')} value={String(form.targetAnnualReturn)} onChange={event => updateField('targetAnnualReturn', event.target.value)} className="surface-input financial-input mt-2" /></label>
                {nearbyError('targetAnnualReturn')}

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
            ) : null}
          </div>

          <div className="settings-section">
            <div className="settings-section-header">
              <div>
                <p className="mini-kicker">{t('资产配置')}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('权重合计须为 100%')}</p>
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

            <div {...fieldProps('assets')} tabIndex={-1} className="scroll-mt-20">{nearbyError('assets')}</div>
            {showAssetForm ? (
              <div className="mt-4 subtle-panel p-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <label className="space-y-2">
                    <span className="text-sm text-muted-foreground">{t('标的')}</span>
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
                      onChange={(event) => setAssetDraft((current) => ({ ...current, currentShares: event.target.value }))}
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
                      onChange={(event) => setAssetDraft((current) => ({ ...current, initialAverageCost: event.target.value }))}
                      className="surface-input financial-input"
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="new-asset-weight-range" className="text-sm text-muted-foreground">{t('新资产权重')}</label>
                    <output htmlFor="new-asset-weight-range" className="data-value">{Math.round((Number(assetDraft.weight) || 0) * 100)}%</output>
                  </div>
                  <input
                    id="new-asset-weight-range"
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.01"
                    value={assetDraft.weight}
                    aria-label={t('新资产权重')}
                    aria-valuetext={`${Math.round((Number(assetDraft.weight) || 0) * 100)}%`}
                    onChange={(event) => setAssetDraft((current) => ({ ...current, weight: Number(event.target.value) }))}
                    className="mt-4 w-full accent-accent"
                  />
                </div>

                {assetErrors.length ? <div aria-label={t('新资产错误')} className="mt-3 text-sm text-warning">{assetErrors.map((error,i) => <p key={i}>{errorText(error,t)}</p>)}</div> : null}
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
                form.assets.map((asset, index) => (
                  <div key={asset.draftRowId} className="subtle-panel p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <label className="block text-sm">{t('资产代码 {index}', { index: index + 1 })}<input type="text" {...fieldProps('assets['+index+'].ticker')} aria-label={t('资产代码 {index}', {index:index+1})} value={asset.ticker} disabled={isProtected(asset) || isSaving} onChange={event=>updateAsset(asset.draftRowId,'ticker',event.target.value)} className="surface-input financial-input mt-2" /></label>
                        {nearbyError('assets['+index+'].ticker')}
                        {asset.name && asset.name.trim().toUpperCase() !== asset.ticker.trim().toUpperCase() ? <p className="mt-1 text-xs text-muted-foreground">{asset.name}</p> : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAsset(asset.draftRowId)}
                        disabled={isProtected(asset) || isSaving}
                        aria-label={t('删除 {ticker}', {ticker:asset.ticker})}
                        className="control-button-danger"
                      >
                        <Trash2 size={14} />
                        {t('删除')}
                      </button>
                    </div>

                    {isProtected(asset) ? <p className="mt-3 text-sm text-muted-foreground">{t('此资产已有关联历史记录或拆合股事件，本阶段不能更改代码或删除，以免历史失去对应资产。')}</p> : null}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between gap-4">
                          <label htmlFor={`asset-weight-range-${index}`} className="text-sm text-muted-foreground">{t('已有资产权重')}</label>
                          <output htmlFor={`asset-weight-range-${index}`} className="data-value">{Math.round((Number(asset.weight) || 0) * 100)}%</output>
                        </div>
                        <input
                          {...fieldProps('assets['+index+'].weight')}
                          id={`asset-weight-range-${index}`}
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={asset.weight}
                          aria-label={t('已有资产权重')}
                          aria-valuetext={`${Math.round((Number(asset.weight) || 0) * 100)}%`}
                          onChange={(event) => updateAsset(asset.draftRowId, 'weight', Number(event.target.value))}
                          className="mt-4 w-full accent-accent"
                        />
                        {nearbyError('assets['+index+'].weight')}
                      </div>

                      <label className="space-y-2">
                        <span className="text-sm text-muted-foreground">{t('计划开始前持仓股数')}</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          {...fieldProps('assets['+index+'].currentShares')} value={asset.currentShares}
                          placeholder="0"
                          onChange={(event) => updateAsset(asset.draftRowId, 'currentShares', event.target.value)}
                          className="surface-input financial-input"
                        />
                      {nearbyError('assets['+index+'].currentShares')}</label>

                      <label className="space-y-2">
                        <span className="text-sm text-muted-foreground">{t('计划开始前持仓均价')}</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          {...fieldProps('assets['+index+'].initialAverageCost')} value={asset.initialAverageCost}
                          placeholder="0"
                          onChange={(event) => updateAsset(asset.draftRowId, 'initialAverageCost', event.target.value)}
                          className="surface-input financial-input"
                        />
                      {nearbyError('assets['+index+'].initialAverageCost')}</label>
                    </div>
                  </div>
                ))
              ) : (
                <div className="subtle-panel px-4 py-6 text-center text-sm text-muted-foreground">
                  {t('还没有添加标的，请至少添加一个资产。')}
                </div>
              )}
            </div>

            <div {...fieldProps('weights')} tabIndex={-1} className={`settings-weight-status mt-4 rounded-md border px-4 py-3 ${isWeightValid ? 'border-positive/30 bg-positive/10 text-positive' : 'border-warning/30 bg-warning/10 text-warning'}`}>
              <span>{t('当前总权重：')}</span>
              <span className="data-value">{Number((totalWeight * 100).toFixed(6))}%</span>
              {nearbyError('weights')}
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
                    placeholder={t('例如 2:1')}
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
                <span className="text-white">{t(form.strategy === 'VA' ? 'VA 定投' : 'DCA 定投')}</span>
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
                  <span className="data-subtle">{formatMoney(form.periodicTarget, plan)}</span>
                </div>
              ) : (
                <>
                  <div className="subtle-row">
                    <span>{t('总预算')}</span>
                    <span className="data-subtle">{formatMoney(form.totalBudget, plan)}</span>
                  </div>
                  <div className="subtle-row">
                    <span>{t('可投资金')}</span>
                    <span className="data-subtle">{formatMoney(deployableCash, plan)}</span>
                  </div>
                  <div className="subtle-row">
                    <span>{t('保留现金')}</span>
                    <span className="data-subtle">{formatMoney(reservedCash, plan)}</span>
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
                  {Number((totalWeight * 100).toFixed(6))}%
                </span>
              </div>
            </div>
          </div>

          <div data-field="form" tabIndex={-1}>{nearbyError('form')}{nearbyError('currentPeriod')}{nearbyError('budgetMode')}{nearbyError('strategy')}</div>
          <PlanValidationSummary errors={errors} onFocus={focusField} />
          {(saveError || persistenceError) ? <div data-field="saveError" tabIndex={-1} aria-label={t('保存失败')} className="subtle-panel p-4 text-warning">{saveError || persistenceError}<p className="mt-2">{t('备份使用最后确认的已保存数据，不含尚未保存的草稿。')}</p></div> : null}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="control-button-primary w-full disabled:cursor-not-allowed disabled:border-white/[0.05] disabled:bg-white/[0.02] disabled:text-muted"
          >
            <Save size={18} />
            {isSaving ? t('保存中') : t('保存当前计划')}
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
      </fieldset>
    </section>
  )
}
