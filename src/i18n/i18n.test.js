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
})
