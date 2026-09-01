import { describe, expect, it } from 'vitest'
import { normalizeLanguage, translate } from './index'

describe('i18n', () => {
  it('normalizes unsupported locales to Chinese', () => {
    expect(normalizeLanguage('fr-FR')).toBe('zh-CN')
  })

  it('translates and interpolates English copy', () => {
    expect(translate('en-US', '第 {period} 期', { period: 3 })).toBe('Period 3')
  })

  it('falls back to Chinese source copy', () => {
    expect(translate('en-US', '尚未收录的文案')).toBe('尚未收录的文案')
  })

  it('translates clarified VA operation metrics', () => {
    expect(translate('en-US', '计划内当前市值')).toBe('In-plan current market value')
    expect(translate('en-US', '本期目标持仓市值')).toBe('Target in-plan market value')
    expect(translate('en-US', '距目标还需投入')).toBe('Amount needed to reach target')
    expect(translate('en-US', '不含计划创建前持仓')).toBe('Excludes holdings before plan start')
  })
})
