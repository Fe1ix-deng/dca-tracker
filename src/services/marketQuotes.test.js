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

    await expect(fetchMarketQuotes(['qld', 'QLD', ''])).resolves.toMatchObject({
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

    await expect(fetchMarketQuotes(['QLD'])).resolves.toMatchObject({
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

it('batches 21 tickers and reports HTTP200 omissions/invalid prices as failures per ticker',async()=>{
 const symbols=Array.from({length:21},(_,i)=>'T'+i);const spy=vi.spyOn(globalThis,'fetch').mockImplementation(async url=>({ok:true,json:async()=>({asOf:'1999-01-01T00:00:00Z',quotes:Object.fromEntries(decodeURIComponent(url.split('=')[1]).split(',').filter(s=>s!=='T2').map(s=>[s,{price:s==='T3'?'12abc':12}]))})}));const result=await fetchMarketQuotes(symbols);expect(spy).toHaveBeenCalledTimes(2);expect(result.failedTickers).toEqual(['T2','T3']);expect(result.quotes.T0.lastSuccessfulFetchAt).toBeTruthy();expect(result.quotes.T0.serviceReportedAt).toBe('1999-01-01T00:00:00Z');expect(result.quotes.T0.lastSuccessfulFetchAt).not.toBe(result.asOf)
})
