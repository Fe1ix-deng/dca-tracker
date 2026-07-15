import { afterEach, describe, expect, it, vi } from 'vitest'
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
})
