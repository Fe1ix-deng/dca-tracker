import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const stylesSource = readFileSync(new URL('./index.css', import.meta.url), 'utf8')

describe('accent theme tokens', () => {
  it('defines all approved accent selectors', () => {
    for (const id of ['indigo', 'amber', 'green', 'rose', 'mono']) {
      expect(stylesSource).toContain(`data-accent='${id}'`)
    }
    expect(stylesSource).toContain('--color-accent-rgb')
  })

  it('uses the confirmed brighter grayscale light surfaces', () => {
    expect(stylesSource).toContain('241 241 238')
    expect(stylesSource).toContain('250 250 247')
    expect(stylesSource).toContain('221 221 218')
  })

  it('uses the confirmed warm orange accent across color modes', () => {
    expect(stylesSource).toContain("--color-accent-rgb: 217 119 87;")
    expect(stylesSource).toContain("--color-accent-hover-rgb: 191 93 66;")
  })

  it('keeps the theme toggle readable across both color schemes', () => {
    expect(stylesSource).toContain('.theme-control .theme-toggle {')
    expect(stylesSource).toContain('color: rgb(var(--color-text-rgb));')
    expect(stylesSource).toContain('background: rgb(var(--color-panel-rgb) / 0.72);')
  })

  it('gives selected accent options a distinct borderless state', () => {
    expect(stylesSource).toContain(".theme-accent-option[aria-checked='true'] {")
    expect(stylesSource).toContain('background: rgb(var(--color-accent-rgb) / 0.12);')
    expect(stylesSource).toContain('border-color: transparent;')
  })

  it('opens the mobile palette below the topbar control', () => {
    expect(stylesSource).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.theme-accent-menu\s*\{[\s\S]*?bottom:\s*auto;[\s\S]*?top:\s*calc\(100% \+ 0\.5rem\);/)
  })
})
