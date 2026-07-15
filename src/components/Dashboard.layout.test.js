import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const dashboardSource = readFileSync(new URL('./Dashboard.jsx', import.meta.url), 'utf8')
const stylesSource = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('dashboard weight cells', () => {
  it('uses a shared numeric alignment column for actual and target weights', () => {
    expect(dashboardSource).toContain('dashboard-weight-value')
    expect(stylesSource).toMatch(/\.dashboard-weight-value\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/)
    expect(stylesSource).toMatch(/\.dashboard-weight-value\s*>\s*\.data-subtle\s*\{[\s\S]*text-align:\s*right;/)
  })

  it('does not render a redundant cost-known status below average cost', () => {
    expect(dashboardSource).not.toContain('成本已知')
    expect(dashboardSource).not.toContain('成本待补')
  })

  it('links ticker hover state to an expanded allocation pie segment', () => {
    expect(dashboardSource).toMatch(/function ActiveWeightShape\(props\)[\s\S]*outerRadius \+ 6/)
    expect(dashboardSource).toMatch(/outerRadius \+ 9/)
    expect(dashboardSource).toMatch(/activeIndex=\{safeActiveWeightIndex\}/)
    expect(dashboardSource).toMatch(/animationDuration=\{180\}/)
    expect(dashboardSource).toMatch(/onMouseEnter=\{\(_, index\) => setActiveWeightIndex\(index\)\}/)
    expect(dashboardSource).toMatch(/onMouseEnter=\{\(\) => setActiveWeightIndex\(index\)\}/)
    expect(dashboardSource).toMatch(/onFocus=\{\(\) => setActiveWeightIndex\(index\)\}/)
  })
})
