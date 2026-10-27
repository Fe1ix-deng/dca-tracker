import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId, createUuid } from './ids'

describe('UUID ids', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'uuid-from-test') })
    expect(createUuid()).toBe('uuid-from-test')
    expect(createId('record')).toBe('record-uuid-from-test')
  })

  it('provides a UUID-shaped fallback in test runtimes without randomUUID', () => {
    vi.stubGlobal('crypto', undefined)
    const first = createUuid()
    const second = createUuid()
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(second).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(second).not.toBe(first)
  })
})
