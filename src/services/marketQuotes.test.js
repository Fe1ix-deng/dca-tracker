import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchMarketQuotes } from './marketQuotes'

describe('fetchMarketQuotes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('requests unique symbols and preserves the quote timestamp', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        quotes: { QLD: { price: 92.19 } },
        asOf: '2026-07-15T12:30:00.000Z',
      }),
    })

    await expect(fetchMarketQuotes(['qld', 'QLD', ''])).resolves.toEqual({
      quotes: { QLD: { price: 92.19 } },
      asOf: '2026-07-15T12:30:00.000Z',
      error: '',
    })
    expect(fetchSpy).toHaveBeenCalledWith('/api/quotes?symbols=QLD')
  })

  it('returns a readable error without discarding a usable response shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ error: '行情服务暂时不可用。' }),
    })

    await expect(fetchMarketQuotes(['QLD'])).resolves.toEqual({
      quotes: {},
      asOf: '',
      error: '行情服务暂时不可用。',
    })
  })

  it('returns numeric quote prices without forcing two-decimal precision', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ quotes: { '600519': { price: '12.3456' } } }),
    })

    await expect(fetchMarketQuotes(['600519'])).resolves.toMatchObject({
      quotes: { '600519': { price: 12.3456 } },
    })
  })
})
