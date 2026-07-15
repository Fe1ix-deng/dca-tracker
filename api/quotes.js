const TWELVE_DATA_URL = 'https://api.twelvedata.com/price'
const CACHE_TTL_MS = 60 * 1000
const quoteCache = new Map()

function normalizeSymbols(value) {
  const rawSymbols = Array.isArray(value) ? value.join(',') : String(value || '')
  return [...new Set(
    rawSymbols
      .split(',')
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean),
  )].slice(0, 20)
}

function parsePrice(value) {
  const price = Number.parseFloat(value)
  return Number.isFinite(price) && price > 0 ? Number(price.toFixed(2)) : null
}

async function fetchProviderQuote(symbol, apiKey) {
  const url = `${TWELVE_DATA_URL}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`
  const response = await fetch(url)
  const data = await response.json()
  const price = parsePrice(data?.price)

  if (price === null) {
    throw new Error(data?.message || '行情供应商未返回有效价格。')
  }

  return { price }
}

async function getQuote(symbol, apiKey) {
  const cached = quoteCache.get(symbol)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.quote
  }

  const quote = await fetchProviderQuote(symbol, apiKey)
  quoteCache.set(symbol, { quote, cachedAt: Date.now() })
  return quote
}

export function clearQuoteCache() {
  quoteCache.clear()
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: '只支持 GET 请求。' })
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) {
    return response.status(503).json({ error: '行情服务未配置。' })
  }

  const symbols = normalizeSymbols(request.query?.symbols)
  if (!symbols.length) {
    return response.status(400).json({ error: '请提供至少一个 ticker。' })
  }

  const entries = await Promise.all(symbols.map(async (symbol) => {
    try {
      return [symbol, await getQuote(symbol, apiKey)]
    } catch {
      return [symbol, null]
    }
  }))

  const quotes = Object.fromEntries(entries.filter(([, quote]) => quote !== null))
  if (!Object.keys(quotes).length) {
    return response.status(502).json({ error: '行情服务暂时不可用。' })
  }

  return response.status(200).json({
    quotes,
    asOf: new Date().toISOString(),
  })
}
