import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { getSavedReserveRatio, normalizeFormPlan, validateSplitEventDraft } from './Settings'

describe('Settings helpers', () => {
  it('uses original baseline holdings as the editable settings values after buys', () => {
    const form = normalizeFormPlan({
      assets: [{
        ticker: 'QLD',
        currentShares: 257.14,
        initialShares: 251.14,
        initialSharesOriginal: 251.14,
        initialAverageCost: 77.62,
        initialAverageCostOriginal: 77.62,
      }],
    })

    expect(form.assets[0].currentShares).toBe('251.14')
    expect(form.assets[0].initialAverageCost).toBe('77.62')
  })

  it('aligns the asset-weight status text and value on a shared baseline', () => {
    const stylesheet = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

    expect(stylesheet).toMatch(/\.settings-weight-status\s*\{[\s\S]*?items-baseline/)
  })

  it('does not force narrow settings layouts to a 320px minimum width', () => {
    const stylesheet = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
    const bodyRule = stylesheet.match(/body\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''

    expect(bodyRule).not.toMatch(/min-width\s*:\s*320px/)
  })

  it('preserves an explicit zero reserve ratio when saving fixed plans', () => {
    expect(getSavedReserveRatio(false, 0)).toBe(0)
  })

  it('falls back to default reserve ratio only when missing', () => {
    expect(getSavedReserveRatio(false, undefined)).toBe(0.2)
  })

  it('always saves zero reserve ratio for open-ended plans', () => {
    expect(getSavedReserveRatio(true, 0.2)).toBe(0)
  })

  it('validates a split event draft against configured tickers', () => {
    expect(validateSplitEventDraft({ ticker: 'QLD', effectiveDate: '2026-06-01', ratio: '2:1' }, ['QLD'])).toEqual({
      ticker: 'QLD',
      effectiveDate: '2026-06-01',
      newShares: 2,
      oldShares: 1,
    })
    expect(validateSplitEventDraft({ ticker: 'SPY', effectiveDate: '2026-06-01', ratio: '2:1' }, ['QLD'])).toBeNull()
    expect(validateSplitEventDraft({ ticker: 'QLD', effectiveDate: '2026-06-01', ratio: 'bad' }, ['QLD'])).toBeNull()
  })

  it('keeps split event changes in the plan draft until the plan is saved', () => {
    const settingsSource = readFileSync(new URL('./Settings.jsx', import.meta.url), 'utf8')

    expect(settingsSource).toMatch(/const \[showSplitEvents, setShowSplitEvents\] = useState\(false\)/)
    expect(settingsSource).toContain('已加入草稿，保存计划后生效')
    expect(settingsSource).toMatch(/aria-expanded=\{showSplitEvents\}/)
  })
})
