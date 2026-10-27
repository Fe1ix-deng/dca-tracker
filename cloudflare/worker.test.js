import { afterEach, expect, it, vi } from 'vitest'
import worker from './worker.js'
afterEach(() => vi.restoreAllMocks())
it('routes quotes to the existing fixed Vercel service without forwarding browser credentials', async () => {
  const upstream = new Response(JSON.stringify({ quotes: { SPY: { price: 120 } } }), { headers: { 'content-type': 'application/json' } })
  const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(upstream)
  const response = await worker.fetch(new Request('https://dca.020023.xyz/api/quotes?symbols=SPY&other=ignored', { headers: { cookie: 'private=1' } }), {})
  expect(fetch).toHaveBeenCalledWith('https://dca-tracker-steel.vercel.app/api/quotes?symbols=SPY')
  expect(await response.json()).toEqual({ quotes: { SPY: { price: 120 } } })
})
it('keeps pages on the existing asset service', async () => {
  const request = new Request('https://dca.020023.xyz/faq')
  const assets = { fetch: vi.fn().mockResolvedValue(new Response('FAQ')) }
  expect(await (await worker.fetch(request, { ASSETS: assets })).text()).toBe('FAQ')
  expect(assets.fetch).toHaveBeenCalledWith(request)
})
it('rejects non-GET quote requests', async () => {
  const response = await worker.fetch(new Request('https://dca.020023.xyz/api/quotes', { method: 'POST' }), {})
  expect(response.status).toBe(405)
})
