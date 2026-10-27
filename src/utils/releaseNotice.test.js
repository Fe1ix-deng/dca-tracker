import { describe, expect, it } from 'vitest'
import { CURRENT_RELEASE, shouldShowReleaseNotice } from './releaseNotice'
import packageMetadata from '../../package.json'
import packageLock from '../../package-lock.json'

describe('release notice visibility', () => {
  it('publishes the 2.7.0 user-facing update summary', () => {
    expect(CURRENT_RELEASE.version).toBe('2.7.0')
    expect(CURRENT_RELEASE.date).toBe('2026-10-28')

    const summary = CURRENT_RELEASE.items.join(' ')
    expect(summary).toContain('保存失败时保留草稿')
    expect(summary).toContain('拆合股估值统一口径')
  })

  it('keeps package metadata on the same release version', () => {
    expect(packageMetadata.version).toBe(CURRENT_RELEASE.version)
    expect(packageLock.version).toBe(CURRENT_RELEASE.version)
    expect(packageLock.packages[''].version).toBe(CURRENT_RELEASE.version)
  })

  it('shows an unread or newer release', () => {
    expect(shouldShowReleaseNotice(null)).toBe(true)
    expect(shouldShowReleaseNotice('2.1.0')).toBe(true)
  })

  it('hides the current acknowledged release', () => {
    expect(shouldShowReleaseNotice(CURRENT_RELEASE.version)).toBe(false)
  })
})
