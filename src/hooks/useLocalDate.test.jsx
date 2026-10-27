// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useLocalDate, nextLocalMidnight } from './useLocalDate'

afterEach(() => vi.restoreAllMocks())
it('refreshes the local business date on focus, visibility and pageshow and cleans listeners', () => {
 let current = new Date(2026, 9, 26, 23, 59, 59)
 const factory = () => current
 const { result, unmount } = renderHook(() => useLocalDate(factory))
 expect(result.current).toBe('2026-10-26')
 current = new Date(2026, 9, 27, 0, 0, 1)
 act(() => window.dispatchEvent(new Event('focus')))
 expect(result.current).toBe('2026-10-27')
 current = new Date(2026, 9, 28)
 act(() => document.dispatchEvent(new Event('visibilitychange')))
 act(() => window.dispatchEvent(new Event('pageshow')))
 expect(result.current).toBe('2026-10-28')
 unmount()
 expect(nextLocalMidnight(new Date(2026, 9, 28, 23, 59, 59))).toBe(1000)
})
