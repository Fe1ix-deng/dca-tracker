import { useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Download, FileUp, Pencil, Trash2 } from 'lucide-react'
import { formatNumericInput, normalizeNumericInput, toNumberOrFallback } from '../utils/numericInput'
import { downloadFile } from '../utils/download'

const filters = [
  { value: 'all', label: '全部' },
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

function formatMoneyPrecise(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatDate(value) {
  return String(value || '').slice(0, 10)
}

function getTagClass(tag) {
  if (tag === 'normal') return 'badge-info'
  if (tag === 'underweight') return 'badge-warning'
  if (tag === 'paused') return 'badge-neutral'
  return 'badge-neutral'
}

function getFilterLabel(value) {
  return filters.find((filter) => filter.value === value)?.label || value || '未标记'
}

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

function isZeroShareAsset(asset) {
  return roundToTwo(asset?.actualShares) === 0
}

function toCsv(records) {
  const header = [
    'periodIndex',
    'date',
    'tag',
    'note',
    'ticker',
    'price',
    'priceSource',
    'targetValue',
    'currentValueBefore',
    'requiredAmount',
    'suggestedShares',
    'actualShares',
    'actualAmount',
    'totalActualAmount',
    'cumulativeInvested',
    'remainingBudget',
  ]

  const rows = records.flatMap((record) =>
    record.assets.map((asset) => [
      record.periodIndex + 1,
      record.date,
      record.tag,
      (record.note || '').replaceAll(',', '，').replaceAll('\n', ' '),
      asset.ticker,
      asset.price,
      asset.priceSource,
      asset.targetValue,
      asset.currentValueBefore,
      asset.requiredAmount,
      asset.suggestedShares,
      asset.actualShares,
      asset.actualAmount,
      record.totalActualAmount,
      record.cumulativeInvested,
      record.remainingBudget,
    ]),
  )

  return [header, ...rows].map((row) => row.join(',')).join('\n')
}

function createEditDraft(record) {
  return {
    tag: record.tag,
    note: record.note || '',
    assets: record.assets.map((asset) => ({
      ticker: asset.ticker,
      price: formatNumericInput(asset.price),
      actualShares: formatNumericInput(asset.actualShares),
    })),
  }
}

function buildRecordWithAssets(record, assets, overrides = {}) {
  const totalActualAmount = roundToTwo(assets.reduce((sum, asset) => sum + (Number(asset.actualAmount) || 0), 0))

  return {
    ...record,
    ...overrides,
    assets,
    totalActualAmount,
  }
}

function parseBackupPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const nextPlans = Array.isArray(parsed.plans)
    ? parsed.plans
    : parsed.plan
      ? [parsed.plan]
      : []
  const nextRecords = Array.isArray(parsed.records) ? parsed.records : []
  const nextActivePlanId = parsed.activePlanId || nextPlans[0]?.id || null

  if (!nextPlans.length && !nextRecords.length) {
    return null
  }

  return {
    plans: nextPlans,
    plan: nextPlans[0] || null,
    activePlanId: nextActivePlanId,
    records: nextRecords,
  }
}

export default function History({ plan, records, onDeleteRecord, onEditRecord, onImportBackup, onExportBackup }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [expandedId, setExpandedId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editDraft, setEditDraft] = useState(null)
  const fileInputRef = useRef(null)
  const isOpenEnded = plan?.budgetMode === 'open-ended'

  const planRecords = useMemo(() => {
    const scoped = plan ? records.filter((record) => record.planId === plan.id) : []
    return scoped.slice().sort((left, right) => right.periodIndex - left.periodIndex)
  }, [plan, records])

  const filteredRecords = useMemo(() => {
    if (activeFilter === 'all') return planRecords
    return planRecords.filter((record) => record.tag === activeFilter)
  }, [activeFilter, planRecords])

  const latestRecord = planRecords[0] || null
  const totalInvested = planRecords.reduce((sum, record) => sum + (Number(record.totalActualAmount) || 0), 0)
  const latestRecordTagLabel = latestRecord ? getFilterLabel(latestRecord.tag) : '暂无记录'
  const activeFilterLabel = getFilterLabel(activeFilter)

  const handleExportCsv = () => {
    if (!planRecords.length) return
    const csv = toCsv(planRecords)
    downloadFile(`${plan?.name || 'dca-tracker'}-history.csv`, csv, 'text/csv;charset=utf-8;')
  }

  const handleExportJson = () => {
    onExportBackup?.()
  }

  const handleDelete = (record) => {
    const confirmed = window.confirm(`确认删除第${record.periodIndex + 1}期记录？此操作不可撤销`)
    if (!confirmed) {
      return
    }

    if (expandedId === record.id) {
      setExpandedId('')
    }
    if (editingId === record.id) {
      setEditingId('')
      setEditDraft(null)
    }

    onDeleteRecord?.(record.id)
  }

  const startEditing = (record) => {
    setExpandedId(record.id)
    setEditingId(record.id)
    setEditDraft(createEditDraft(record))
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditDraft(null)
  }

  const updateDraftAsset = (ticker, patch) => {
    setEditDraft((current) => ({
      ...current,
      assets: current.assets.map((asset) => (asset.ticker === ticker ? { ...asset, ...patch } : asset)),
    }))
  }

  const buildEditedRecord = (record, draft) => {
    const nextAssets = record.assets.map((asset) => {
      const patch = draft.assets.find((item) => item.ticker === asset.ticker)
      const price = roundToTwo(toNumberOrFallback(patch?.price, asset.price))
      const actualShares = roundToTwo(toNumberOrFallback(patch?.actualShares, 0))
      return {
        ...asset,
        price,
        actualShares,
        actualAmount: roundToTwo(price * actualShares),
      }
    })

    return buildRecordWithAssets(record, nextAssets, {
      tag: draft.tag,
      note: draft.note,
    })
  }

  const handleSaveEdit = (record) => {
    if (!editDraft) {
      return
    }

    onEditRecord?.(buildEditedRecord(record, editDraft))

    setEditingId('')
    setEditDraft(null)
  }

  const handleDeleteAsset = (record, asset) => {
    if (record.assets.length <= 1) {
      return
    }

    const sourceRecord = editingId === record.id && editDraft ? buildEditedRecord(record, editDraft) : record
    const sourceAsset = sourceRecord.assets.find((item) => item.ticker === asset.ticker)

    if (!isZeroShareAsset(sourceAsset)) {
      return
    }

    const confirmed = window.confirm(`确认从第${record.periodIndex + 1}期删除 ${asset.ticker}？此操作只会删除该期的这个标的。`)
    if (!confirmed) {
      return
    }

    const nextAssets = sourceRecord.assets.filter((item) => item.ticker !== asset.ticker)

    onEditRecord?.(buildRecordWithAssets(sourceRecord, nextAssets))
    setEditingId('')
    setEditDraft(null)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const parsed = JSON.parse(content)
      const payload = parseBackupPayload(parsed)

      if (!payload) {
        window.alert('文件格式不正确，请使用本工具导出的 JSON 备份文件。')
        return
      }

      const confirmed = window.confirm(
        '导入前会先自动导出一份当前数据的安全备份到你的下载目录，然后用导入的文件整体覆盖现有计划和历史记录，确认继续？',
      )
      if (!confirmed) {
        return
      }

      cancelEditing()
      setExpandedId('')
      onImportBackup?.(payload)
    } catch {
      window.alert('文件格式不正确，请使用本工具导出的 JSON 备份文件。')
    }
  }

  if (!plan) {
    return (
      <section className="section-shell">
        <div className="empty-state text-textSoft">
          <p className="label">Execution Archive</p>
          <h2 className="empty-state-title">还没有计划</h2>
          <p className="body-copy mx-auto mt-3 max-w-xl">请先创建计划，历史记录会在执行后自动累积。</p>
        </div>
      </section>
    )
  }

  return (
    <section className="section-shell">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label">Execution Archive</p>
            <h2 className="section-title">历史记录</h2>
            <p className="muted-copy mt-3 max-w-2xl">
              {isOpenEnded
                ? '无限定投模式下，所有记录会持续累积。这里更像一份执行台账，而不是列表堆叠。'
                : '固定预算模式下，你可以在这里回看每一期的投入、执行偏差和计划推进情况。'}
            </p>
          </div>

          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!planRecords.length}
              className="control-button"
            >
              <Download size={16} />
              导出 CSV
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="control-button"
            >
              <Download size={16} />
              导出备份
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="control-button"
            >
              <FileUp size={16} />
              导入备份
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              aria-label="选择要导入的 JSON 备份文件"
              className="hidden"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-4">
          <div className="surface-stat">
            <p className="mini-kicker">记录数</p>
            <p className="mt-3 data-value text-xl">{planRecords.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">当前计划累计期数</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">累计投入</p>
            <p className="mt-3 data-value text-xl">{formatMoney(totalInvested)}</p>
            <p className="mt-2 text-xs text-muted-foreground">所有记录的实际投入总和</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">最近记录</p>
            <p className="mt-3 data-value text-xl">{latestRecord ? formatDate(latestRecord.date) : '--'}</p>
            <p className="mt-2 text-xs text-muted-foreground">{latestRecordTagLabel}</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">模式</p>
            <p className="mt-3 text-base font-medium text-white">{isOpenEnded ? '无限定投' : '固定预算'}</p>
            <p className="mt-2 text-xs text-muted-foreground">当前筛选 {activeFilterLabel}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = activeFilter === filter.value
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`filter-chip ${active ? 'filter-chip-active' : ''}`}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="timeline-list">
        {filteredRecords.length ? (
          filteredRecords.map((record) => {
            const expanded = expandedId === record.id
            const editing = editingId === record.id && editDraft

            return (
              <article key={record.id} className="timeline-card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-[1.02rem] font-semibold tracking-[-0.02em] text-white">第 {record.periodIndex + 1} 期</h3>
                      <span className="data-subtle text-sm">{formatDate(record.date)}</span>
                      <span className={getTagClass(record.tag)}>
                        {getFilterLabel(record.tag)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="subtle-panel p-4">
                        <p className="mini-kicker">本期投入</p>
                        <p className="mt-3 data-value text-xl">{formatMoney(record.totalActualAmount)}</p>
                      </div>
                      <div className="subtle-panel p-4">
                        <p className="mini-kicker">累计投入</p>
                        <p className="mt-3 data-value text-xl">{formatMoney(record.cumulativeInvested)}</p>
                      </div>
                      <div className="subtle-panel p-4">
                        <p className="mini-kicker">{isOpenEnded ? '标的数量' : '当期剩余可投'}</p>
                        <p className="mt-3 data-value text-xl">
                          {isOpenEnded ? record.assets.length : formatMoney(record.remainingBudget)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                      {record.note || '本期未填写备注。'}
                    </p>
                  </div>

                  <div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? '' : record.id)}
                      className="control-button"
                    >
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {expanded ? '收起详情' : '展开详情'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(record)}
                      className="control-button-positive"
                    >
                      <Pencil size={16} />
                      编辑记录
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(record)}
                      className="control-button-danger"
                    >
                      <Trash2 size={16} />
                      删除
                    </button>
                  </div>
                </div>

                {editing ? (
                  <div className="mt-5 border-t border-white/[0.06] pt-5">
                    <div className="mb-4 rounded-md border border-accent/20 bg-accent/10 px-3 py-2 text-sm text-textSoft">
                      正在编辑第 {record.periodIndex + 1} 期记录，保存后会沿用现有回调重建计划状态。
                    </div>
                    <div className="grid gap-4 xl:grid-cols-2">
                      {record.assets.map((asset) => {
                        const draftAsset = editDraft.assets.find((item) => item.ticker === asset.ticker) || {
                          price: Number(asset.price) || 0,
                          actualShares: Number(asset.actualShares) || 0,
                        }

                        return (
                          <div key={asset.ticker} className="subtle-panel p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="data-value text-base">{asset.ticker}</p>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                <span className="mini-kicker">{asset.priceSource === 'auto' ? '自动价格' : '手动价格'}</span>
                                {isZeroShareAsset(draftAsset) && record.assets.length > 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAsset(record, asset)}
                                    className="control-button-danger px-3 py-2 text-xs"
                                  >
                                    <Trash2 size={14} />
                                    删除该标的
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <label className="space-y-2">
                                <span className="text-sm text-muted-foreground">操作价格</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  step="0.01"
                                  value={draftAsset.price}
                                  onChange={(event) => updateDraftAsset(asset.ticker, { price: normalizeNumericInput(event.target.value) })}
                                  onBlur={() => updateDraftAsset(asset.ticker, { price: formatNumericInput(draftAsset.price) })}
                                  className="surface-input financial-input"
                                />
                              </label>
                              <label className="space-y-2">
                                <span className="text-sm text-muted-foreground">实际买入股数</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  step="0.01"
                                  value={draftAsset.actualShares}
                                  onChange={(event) => updateDraftAsset(asset.ticker, { actualShares: normalizeNumericInput(event.target.value) })}
                                  onBlur={() => updateDraftAsset(asset.ticker, { actualShares: formatNumericInput(draftAsset.actualShares) })}
                                  className="surface-input financial-input"
                                />
                              </label>
                            </div>
                            <div className="mt-4 subtle-row">
                              <span>实际投入</span>
                              <span className="data-subtle">
                                {formatMoney(roundToTwo(toNumberOrFallback(draftAsset.price, 0) * toNumberOrFallback(draftAsset.actualShares, 0)))}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(220px,0.36fr)_minmax(0,1fr)]">
                      <label className="space-y-2">
                        <span className="text-sm text-muted-foreground">决策标签</span>
                        <select
                          value={editDraft.tag}
                          onChange={(event) => setEditDraft((current) => ({ ...current, tag: event.target.value }))}
                          className="surface-select"
                        >
                          {filters.filter((filter) => filter.value !== 'all').map((filter) => (
                            <option key={filter.value} value={filter.value}>
                              {filter.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm text-muted-foreground">备注</span>
                        <textarea
                          rows="4"
                          value={editDraft.note}
                          onChange={(event) => setEditDraft((current) => ({ ...current, note: event.target.value }))}
                          className="surface-textarea"
                        />
                      </label>
                    </div>

                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="control-button"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(record)}
                        className="control-button-primary"
                      >
                        保存记录
                      </button>
                    </div>
                  </div>
                ) : expanded ? (
                  <div className="mt-5 border-t border-white/[0.06] pt-5">
                    <div className="grid gap-3">
                      {record.assets.map((asset) => (
                        <div key={asset.ticker} className="subtle-panel p-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <p className="data-value text-base">{asset.ticker}</p>
                              <p className="mt-1 text-xs text-muted-foreground">价格来源：{asset.priceSource === 'auto' ? '自动' : '手动'}</p>
                            </div>
                            <div className="grid gap-2 text-right">
                              <p className="text-sm text-muted-foreground">
                                操作价格 <span className="data-subtle">{formatMoneyPrecise(asset.price)}</span>
                              </p>
                              <p className="text-sm text-muted-foreground">
                                目标值 <span className="data-subtle">{formatMoney(asset.targetValue)}</span>
                              </p>
                              {isZeroShareAsset(asset) && record.assets.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAsset(record, asset)}
                                  className="control-button-danger justify-self-end px-3 py-2 text-xs"
                                >
                                  <Trash2 size={14} />
                                  删除该标的
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-4">
                            <div className="surface-stat">
                              <p className="mini-kicker">前持仓价值</p>
                              <p className="mt-3 data-value text-base">{formatMoney(asset.currentValueBefore)}</p>
                            </div>
                            <div className="surface-stat">
                              <p className="mini-kicker">建议买入</p>
                              <p className="mt-3 data-value text-base">{formatMoney(asset.requiredAmount)}</p>
                            </div>
                            <div className="surface-stat">
                              <p className="mini-kicker">建议股数</p>
                              <p className="mt-3 data-value text-base">{asset.suggestedShares}</p>
                            </div>
                            <div className="surface-stat">
                              <p className="mini-kicker">实际买入</p>
                              <p className="mt-3 data-value text-base">{asset.actualShares} 股</p>
                              <p className="mt-2 data-subtle text-sm">{formatMoney(asset.actualAmount)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            )
          })
        ) : (
          <div className="empty-state text-muted-foreground">
            <p className="label">No Records</p>
            <h2 className="empty-state-title">当前筛选条件下还没有记录</h2>
          </div>
        )}
      </div>
    </section>
  )
}
