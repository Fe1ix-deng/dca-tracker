import { afterEach, describe, expect, it, vi } from 'vitest'
import handler, { clearQuoteCache } from './quotes'

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) {
      this.headers[name] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

describe('quotes API', () => {
  const originalApiKey = process.env.TWELVE_DATA_API_KEY

  afterEach(() => {
    process.env.TWELVE_DATA_API_KEY = originalApiKey
    clearQuoteCache()
    vi.restoreAllMocks()
  })

  it('returns normalized quotes and caches repeated symbol requests', async () => {
    process.env.TWELVE_DATA_API_KEY = 'test-key'
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ json: async () => ({ price: '92.19' }) })
      .mockResolvedValueOnce({ json: async () => ({ price: '36' }) })
    const request = { method: 'GET', query: { symbols: 'qld,IBIT,QLD' } }
    const firstResponse = createResponse()

    await handler(request, firstResponse)

    expect(firstResponse.statusCode).toBe(200)
    expect(firstResponse.body.quotes).toEqual({
      QLD: { price: 92.19 },
      IBIT: { price: 36 },
    })
    expect(firstResponse.headers['Cache-Control']).toContain('s-maxage=60')

    const secondResponse = createResponse()
    await handler(request, secondResponse)

    expect(secondResponse.body.quotes).toEqual(firstResponse.body.quotes)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('returns a configuration error without calling the provider', async () => {
    delete process.env.TWELVE_DATA_API_KEY
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = createResponse()

    await handler({ method: 'GET', query: { symbols: 'QLD' } }, response)

    expect(response.statusCode).toBe(503)
    expect(response.body).toEqual({ error: '行情服务未配置。' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
