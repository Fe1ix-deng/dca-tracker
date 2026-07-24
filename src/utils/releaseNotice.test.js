import { describe, expect, it } from 'vitest'
import { CURRENT_RELEASE, shouldShowReleaseNotice } from './releaseNotice'

describe('release notice visibility', () => {
  it('shows an unread or newer release', () => {
    expect(shouldShowReleaseNotice(null)).toBe(true)
    expect(shouldShowReleaseNotice('2.1.0')).toBe(true)
  })

  it('hides the current acknowledged release', () => {
    expect(shouldShowReleaseNotice(CURRENT_RELEASE.version)).toBe(false)
  })
})
