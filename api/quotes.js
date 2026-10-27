const TWELVE_DATA_URL = 'https://api.twelvedata.com/price'
const CACHE_TTL_MS = 60 * 1000
const FETCH_TIMEOUT_MS = 5000
const RATE_WINDOW_MS = 60 * 1000
const RATE_LIMIT = 60
const MAX_SYMBOLS = 20
import { TICKER_RE } from '../src/utils/planConstraints.js'
const quoteCache = new Map()
const requestTimes = []

function normalizeSymbols(value) {
  const rawSymbols = Array.isArray(value) ? value.join(',') : String(value || '')
  const parts = [...new Set(rawSymbols.split(',').map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
  if (parts.length > MAX_SYMBOLS) return null
  if (parts.some((symbol) => !TICKER_RE.test(symbol))) return null
  return parts
}

function parsePrice(value) {
  const price = Number.parseFloat(value)
  return Number.isFinite(price) && price > 0 ? price : null
}

async function fetchProviderQuote(symbol, apiKey) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const url = `${TWELVE_DATA_URL}?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`
    const response = await Promise.race([fetch(url), new Promise((_, reject) => setTimeout(() => reject(new Error('行情请求超时。')), FETCH_TIMEOUT_MS))])
    let data
    try { data = await response.json() } catch { throw new Error('行情供应商返回了无效 JSON。') }
    if (response.ok === false) throw new Error(data?.message || `行情供应商请求失败（${response.status}）。`)
    const price = parsePrice(data?.price)
    if (price === null) throw new Error(data?.message || '行情供应商未返回有效价格。')
    return { price }
  } finally { clearTimeout(timeout) }
}

async function getQuote(symbol, apiKey) {
  const cached = quoteCache.get(symbol)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) return cached.quote
  const quote = await fetchProviderQuote(symbol, apiKey)
  quoteCache.set(symbol, { quote, cachedAt: Date.now() })
  return quote
}

function allowRequest() {
  const now = Date.now()
  while (requestTimes[0] && now - requestTimes[0] > RATE_WINDOW_MS) requestTimes.shift()
  if (requestTimes.length >= RATE_LIMIT) return false
  requestTimes.push(now)
  return true
}

export function clearQuoteCache() { quoteCache.clear(); requestTimes.length = 0 }

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')
  if (request.method !== 'GET') { response.setHeader('Allow', 'GET'); return response.status(405).json({ error: '只支持 GET 请求。' }) }
  const apiKey = process.env.TWELVE_DATA_API_KEY
  if (!apiKey) return response.status(503).json({ error: '行情服务未配置。' })
  const symbols = normalizeSymbols(request.query?.symbols)
  if (symbols === null || !symbols.length) return response.status(400).json({ error: symbols === null ? 'ticker 格式或数量无效。' : '请提供至少一个 ticker。' })
  if (!allowRequest()) return response.status(429).json({ error: '请求过于频繁，请稍后再试。' })
  const entries = await Promise.all(symbols.map(async (symbol) => { try { return [symbol, await getQuote(symbol, apiKey)] } catch { return [symbol, null] } }))
  const quotes = Object.fromEntries(entries.filter(([, quote]) => quote !== null))
  if (!Object.keys(quotes).length) return response.status(502).json({ error: '行情服务暂时不可用。' })
  return response.status(200).json({ quotes, asOf: new Date().toISOString() })
}
