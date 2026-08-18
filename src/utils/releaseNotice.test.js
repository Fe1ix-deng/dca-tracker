import { describe, expect, it } from 'vitest'
import { CURRENT_RELEASE, shouldShowReleaseNotice } from './releaseNotice'
import packageMetadata from '../../package.json'
import packageLock from '../../package-lock.json'

describe('release notice visibility', () => {
  it('publishes the complete 2.4.2 user-facing update summary', () => {
    expect(CURRENT_RELEASE.version).toBe('2.4.2')
    expect(CURRENT_RELEASE.date).toBe('2026-08-18')

    const summary = CURRENT_RELEASE.items.join(' ')
    expect(summary).toContain('导入 JSON 备份')
    expect(summary).toContain('定投历史记录')
    expect(summary).toContain('临时计划')
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
