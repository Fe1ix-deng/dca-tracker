import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const operationSource = readFileSync(new URL('./OperationPanel.jsx', import.meta.url), 'utf8')
const stylesSource = readFileSync(new URL('../index.css', import.meta.url), 'utf8')

describe('operation commit card layout', () => {
  it('uses a single-column flow with header readiness and a compact note', () => {
    expect(operationSource).toContain('operation-commit-card')
    expect(operationSource).toContain('operation-commit-header')
    expect(operationSource).toContain('operation-commit-summary')
    expect(operationSource).toContain('operation-commit-footer')
    expect(operationSource).toMatch(/operation-commit-header[\s\S]*?Ready[\s\S]*?Pending/)
    expect(operationSource).toMatch(/operation-commit-summary[\s\S]*?本期实际投入[\s\S]*?累计投入[\s\S]*?剩余可投/)
    expect(operationSource).toMatch(/rows="3"/)
    expect(operationSource).not.toContain('xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]')
  })

  it('keeps VA metric cards focused on labels and values', () => {
    expect(operationSource).toContain('计划内当前市值')
    expect(operationSource).not.toContain('不含计划创建前持仓')
    expect(operationSource).not.toContain('买入后计划内持仓应达到')
    expect(operationSource).not.toContain('目标值 − 当前计划内市值')
    expect(operationSource).not.toContain('按当前价格换算')
  })

  it('defines responsive summary and submission footer behavior', () => {
    expect(stylesSource).toMatch(/\.operation-commit-summary\s*\{[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(10rem, 1fr\)\);/)
    expect(stylesSource).toMatch(/\.operation-commit-summary-open\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(10rem, 1fr\)\);/)
    expect(stylesSource).toMatch(/\.operation-commit-footer\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/)
    expect(stylesSource).toMatch(/@media \(max-width: 900px\)[\s\S]*\.operation-commit-summary\s*\{[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(10rem, 1fr\)\);/)
    const tabletRuleIndex = stylesSource.indexOf('@media (max-width: 900px)')
    const mobileOverrideIndex = stylesSource.lastIndexOf('@media (max-width: 640px)')
    expect(mobileOverrideIndex).toBeGreaterThan(tabletRuleIndex)
    expect(stylesSource.slice(mobileOverrideIndex)).toMatch(/\.operation-commit-summary[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\);/)
    expect(stylesSource).toMatch(/\.operation-commit-value\s*\{[\s\S]*overflow:\s*visible;[\s\S]*text-overflow:\s*clip;[\s\S]*white-space:\s*normal;/)
  })
})
