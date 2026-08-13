import { describe, expect, it } from 'vitest'
import { CURRENT_RELEASE, shouldShowReleaseNotice } from './releaseNotice'

describe('release notice visibility', () => {
  it('publishes the complete 2.4.0 user-facing update summary', () => {
    expect(CURRENT_RELEASE.version).toBe('2.4.0')
    expect(CURRENT_RELEASE.date).toBe('2026-08-13')

    const summary = CURRENT_RELEASE.items.join(' ')
    expect(summary).toContain('拆股')
    expect(summary).toContain('强调色')
    expect(summary).toContain('总览')
    expect(summary).toContain('本期操作')
    expect(summary).toContain('连续执行')
  })

  it('shows an unread or newer release', () => {
    expect(shouldShowReleaseNotice(null)).toBe(true)
    expect(shouldShowReleaseNotice('2.1.0')).toBe(true)
  })

  it('hides the current acknowledged release', () => {
    expect(shouldShowReleaseNotice(CURRENT_RELEASE.version)).toBe(false)
  })
})
