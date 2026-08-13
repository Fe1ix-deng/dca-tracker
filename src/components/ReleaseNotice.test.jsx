import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./ReleaseNotice.jsx', import.meta.url), 'utf8')
const styles = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('release notice interface', () => {
  it('has a labelled bell and acknowledgement action', () => {
    expect(source).toContain('aria-label="查看版本更新"')
    expect(source).toContain('已读')
    expect(source).toContain('saveLastReadReleaseVersion(CURRENT_RELEASE.version)')
    expect(source).toContain("window.dispatchEvent(new Event(RELEASE_READ_EVENT))")
  })

  it('uses Escape closing and a right-aligned unclipped panel', () => {
    expect(source).toContain("event.key === 'Escape'")
    expect(styles).toMatch(/\.release-notice-panel\s*\{[\s\S]*right:\s*0;/)
    expect(styles).toMatch(/\.app-toolbar\s*\{[\s\S]*position:\s*fixed;/)
  })

  it('contracts vertically toward the bell without lateral drift', () => {
    expect(styles).toMatch(/@keyframes release-notice-contract\s*\{[\s\S]*translateY\(-3\.15rem\) scale\(0\.11\)/)
  })
})
