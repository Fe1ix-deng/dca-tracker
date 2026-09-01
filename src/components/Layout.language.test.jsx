import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./Layout.jsx', import.meta.url), 'utf8')

describe('language control', () => {
  it('renders a persistent Chinese/English control in desktop and mobile shells', () => {
    expect(source).toContain('function LanguageControl')
    expect(source).toContain("onChangeLanguage('zh-CN')")
    expect(source).toContain("onChangeLanguage('en-US')")
    expect(source).toContain('<LanguageControl')
  })
})
