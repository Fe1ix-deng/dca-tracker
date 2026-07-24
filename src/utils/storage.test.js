import { describe, expect, it } from 'vitest'
import {
  computeHasUnbackedChanges,
  loadLastReadReleaseVersion,
  normalizeRecords,
  saveLastReadReleaseVersion,
} from './storage'

describe('computeHasUnbackedChanges', () => {
  it('is false when there have been no data changes yet', () => {
    expect(computeHasUnbackedChanges(null, null)).toBe(false)
  })

  it('is true when data changed but a backup has never been made', () => {
    expect(computeHasUnbackedChanges(null, '2026-07-01T00:00:00.000Z')).toBe(true)
  })

  it('is false when the last backup happened after the last change', () => {
    expect(
      computeHasUnbackedChanges('2026-07-05T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
    ).toBe(false)
  })

  it('is true when data changed again after the last backup', () => {
    expect(
      computeHasUnbackedChanges('2026-07-01T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
    ).toBe(true)
  })
})

describe('normalizeRecords', () => {
  it('keeps usable legacy records while supplying an empty assets array for incomplete records', () => {
    expect(normalizeRecords([
      { id: 'record-1', planId: 'plan-1', assets: null },
      { id: 'record-2', planId: 'plan-1', assets: [{ ticker: 'QLD' }] },
      null,
    ])).toEqual([
      { id: 'record-1', planId: 'plan-1', assets: [] },
      { id: 'record-2', planId: 'plan-1', assets: [{ ticker: 'QLD' }] },
    ])
  })

  it('returns an empty list when stored records are not an array', () => {
    expect(normalizeRecords({ id: 'record-1' })).toEqual([])
  })
})

describe('release acknowledgement storage', () => {
  it('persists the last acknowledged release version', () => {
    const originalWindow = globalThis.window
    const values = new Map()
    globalThis.window = {
      localStorage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
      },
    }

    try {
      saveLastReadReleaseVersion('2.2.0')
      expect(loadLastReadReleaseVersion()).toBe('2.2.0')
    } finally {
      globalThis.window = originalWindow
    }
  })

  it('falls back safely when localStorage access throws', () => {
    const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: Object.defineProperties({}, {
        localStorage: {
          get() {
            throw new Error('storage is blocked')
          },
        },
      }),
    })

    try {
      expect(loadLastReadReleaseVersion()).toBe(null)
      expect(() => saveLastReadReleaseVersion('2.2.0')).not.toThrow()
    } finally {
      if (originalWindowDescriptor) {
        Object.defineProperty(globalThis, 'window', originalWindowDescriptor)
      } else {
        delete globalThis.window
      }
    }
  })
})
