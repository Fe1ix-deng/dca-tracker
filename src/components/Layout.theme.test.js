import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const layoutSource = readFileSync(new URL('./Layout.jsx', import.meta.url), 'utf8')
const appSource = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8')

describe('theme palette control', () => {
  it('defines the five approved accent ids', () => {
    for (const id of ['indigo', 'amber', 'green', 'rose', 'mono']) expect(layoutSource).toContain(`id: '${id}'`)
  })

  it('wires accent through App into Layout', () => {
    expect(appSource).toContain('const { accent, setAccent')
    expect(appSource).toContain('accent={accent}')
    expect(appSource).toContain('onChangeAccent={setAccent}')
  })

  it('uses an expandable arrow with keyboard and outside-click close paths', () => {
    expect(layoutSource).toContain('aria-expanded={isAccentMenuOpen}')
    expect(layoutSource).toContain('onKeyDown={handleAccentKeyDown}')
    expect(layoutSource).toContain("event.key === 'Escape'")
    expect(layoutSource).toContain('handleDocumentPointerDown')
  })
})
