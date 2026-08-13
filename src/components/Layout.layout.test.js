import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const layoutSource = readFileSync(new URL('./Layout.jsx', import.meta.url), 'utf8')
const dashboardSource = readFileSync(new URL('./Dashboard.jsx', import.meta.url), 'utf8')
const stylesSource = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('global release notice placement', () => {
  it('mounts one release notice in the desktop and mobile shell toolbars', () => {
    expect(layoutSource).toContain("import ReleaseNotice from './ReleaseNotice'")
    expect(layoutSource).toMatch(/<div className="app-toolbar desktop-release-notice">[\s\S]*?<ReleaseNotice \/>/)
    expect(layoutSource).toMatch(/<div className="mobile-release-notice">[\s\S]*?<ReleaseNotice \/>/)
  })

  it('removes duplicate release notice mounts from dashboard content branches', () => {
    expect(dashboardSource).not.toContain("import ReleaseNotice from './ReleaseNotice'")
    expect(dashboardSource).not.toContain('<ReleaseNotice />')
  })

  it('defines a shell toolbar that keeps the panel anchored to the viewport edge', () => {
    expect(stylesSource).toMatch(/\.app-toolbar\s*\{[\s\S]*justify-content:\s*flex-end;/)
    expect(stylesSource).toMatch(/\.release-notice-panel\s*\{[\s\S]*right:\s*0;/)
    expect(stylesSource).toMatch(/\.dashboard-overview-card\s*\{[\s\S]*overflow:\s*hidden;/)
    expect(stylesSource).toMatch(/\.desktop-release-notice\s*\{[\s\S]*display:\s*none;/)
  })

  it('centers the theme label independently from its icon', () => {
    expect(stylesSource).toMatch(/\.theme-control \.theme-toggle\s*\{[\s\S]*position:\s*relative;/)
    expect(stylesSource).toMatch(/\.theme-control \.theme-toggle:not\(\.theme-toggle-compact\) > span\s*\{[\s\S]*left:\s*50%;[\s\S]*transform:/)
  })

  it('uses a positioned plan selector arrow instead of the native arrow', () => {
    expect(layoutSource).toContain('className="shell-plan-select-wrap"')
    expect(layoutSource).toMatch(/<ChevronDown[\s\S]*className="shell-plan-select-arrow"/)
    expect(stylesSource).toMatch(/\.shell-plan-select-wrap\s*\{[\s\S]*position:\s*relative;/)
    expect(stylesSource).toMatch(/\.shell-plan select\s*\{[\s\S]*appearance:\s*none;/)
    expect(stylesSource).toMatch(/\.shell-plan-select-arrow\s*\{[\s\S]*right:\s*1rem;/)
  })
})
