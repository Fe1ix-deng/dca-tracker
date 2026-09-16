import { describe, expect, it } from 'vitest'
import { getPathForTab, getTabFromPath } from './navigation'

describe('FAQ route mapping', () => {
  it('maps the public FAQ path to the FAQ tab', () => {
    expect(getTabFromPath('/faq')).toBe('faq')
    expect(getTabFromPath('/faq/')).toBe('faq')
  })

  it('keeps application tabs on the homepage URL', () => {
    expect(getTabFromPath('/')).toBe('dashboard')
    expect(getTabFromPath('/unknown')).toBe('dashboard')
    expect(getPathForTab('faq')).toBe('/faq')
    expect(getPathForTab('settings')).toBe('/')
  })
})
