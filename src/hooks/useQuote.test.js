import { afterEach, describe, expect, it, vi } from 'vitest'
import * as marketQuotes from '../services/marketQuotes'
import { fetchQuote, normalizeManualPrice } from './useQuote'

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

    expect(result).toMatchObject({
      price: 123.46,
      error: '',
    })
    expect(fetchSpy).toHaveBeenCalledWith('/api/quotes?symbols=QLD')
  })

  it('rounds CN quotes to three decimals', async () => {
    vi.spyOn(marketQuotes, 'fetchMarketQuotes').mockResolvedValue({
      quotes: { '600519': { price: 12.3456 } },
      asOf: '',
      error: '',
    })

    await expect(fetchQuote('600519', 'CN')).resolves.toMatchObject({
      price: 12.346,
      error: '',
    })
  })

  it('keeps US quote rounding at two decimals', async () => {
    vi.spyOn(marketQuotes, 'fetchMarketQuotes').mockResolvedValue({
      quotes: { SCHB: { price: 12.3456 } },
      asOf: '',
      error: '',
    })

    await expect(fetchQuote('SCHB', 'US')).resolves.toMatchObject({
      price: 12.35,
      error: '',
    })
  })

  it('returns a manual-entry error when the quote service rejects unexpectedly', async () => {
    vi.spyOn(marketQuotes, 'fetchMarketQuotes').mockRejectedValue(new Error('service unavailable'))

    await expect(fetchQuote('QLD')).resolves.toMatchObject({
      price: null,
      error: '网络异常，无法获取最新行情。',
    })
  })

  it('ignores a slow quote after a newer request aborts it', async () => {
    let resolveOld
    let resolveNew
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveNew = resolve }))

    const oldController = new AbortController()
    const newController = new AbortController()
    const oldRequest = fetchQuote('OLD', 'US', { signal: oldController.signal })
    oldController.abort()
    const newRequest = fetchQuote('NEW', 'US', { signal: newController.signal })

    resolveOld({ ok: true, json: async () => ({ quotes: { OLD: { price: 10 } } }) })
    resolveNew({ ok: true, json: async () => ({ quotes: { NEW: { price: 20 } } }) })

    await expect(oldRequest).resolves.toMatchObject({ price: null, aborted: true })
    await expect(newRequest).resolves.toMatchObject({ price: 20, error: '' })
  })
})

describe('normalizeManualPrice', () => {
  it('rounds manual fallback prices using the plan market precision', () => {
    expect(normalizeManualPrice('12.3456', 'CN')).toBe(12.346)
    expect(normalizeManualPrice('12.3456', 'US')).toBe(12.35)
  })
})
