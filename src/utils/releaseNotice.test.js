import { describe, expect, it } from 'vitest'
import { CURRENT_RELEASE, shouldShowReleaseNotice } from './releaseNotice'

describe('release notice visibility', () => {
  it('publishes the complete 2.4.1 user-facing update summary', () => {
    expect(CURRENT_RELEASE.version).toBe('2.4.1')
    expect(CURRENT_RELEASE.date).toBe('2026-08-14')

    const summary = CURRENT_RELEASE.items.join(' ')
    expect(summary).toContain('原有持仓')
    expect(summary).toContain('VA 定投')
    expect(summary).toContain('历史价格')
    expect(summary).toContain('剩余预算')
    expect(summary).toContain('拆股')
  })

  it('shows an unread or newer release', () => {
    expect(shouldShowReleaseNotice(null)).toBe(true)
    expect(shouldShowReleaseNotice('2.1.0')).toBe(true)
  })

  it('hides the current acknowledged release', () => {
    expect(shouldShowReleaseNotice(CURRENT_RELEASE.version)).toBe(false)
  })
})
