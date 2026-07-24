import { afterEach, describe, expect, it, vi } from 'vitest'
import * as marketQuotes from '../services/marketQuotes'
import { fetchQuote } from './useQuote'

describe('fetchQuote', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches quotes through the server-side market data endpoint', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ quotes: { QLD: { price: 123.456 } } }),
    })

    const result = await fetchQuote('qld')

    expect(result).toEqual({
      price: 123.46,
      error: '',
    })
    expect(fetchSpy).toHaveBeenCalledWith('/api/quotes?symbols=QLD')
  })

  it('returns a manual-entry error when the quote service rejects unexpectedly', async () => {
    vi.spyOn(marketQuotes, 'fetchMarketQuotes').mockRejectedValue(new Error('service unavailable'))

    await expect(fetchQuote('QLD')).resolves.toEqual({
      price: null,
      error: '网络异常，无法获取最新行情。',
    })
  })
})
