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
})
