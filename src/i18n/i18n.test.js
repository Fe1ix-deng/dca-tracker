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
  })

  it('covers user-facing stage three labels in English', () => {
    const keys = [
      '总览',
      '本期操作',
      '历史记录',
      '计划设置',
      '确认本期记录',
      '可以保存',
      '请补充信息',
      '执行状态',
      '仓位偏离',
      '暂无记录',
      'VA 定投',
      'DCA 定投',
      '正常执行',
      '主动低配',
      '本期暂停',
      '标的',
      '保存前检查',
      'Personal Console',
    ]

    keys.forEach((key) => {
      expect(translate('en-US', key), key).not.toBe(key)
    })
  })
})
