function normalizeSymbols(symbols) {
  return [...new Set(
    (Array.isArray(symbols) ? symbols : [])
      .map((symbol) => String(symbol || '').trim().toUpperCase())
      .filter(Boolean),
  )]
}

function normalizeQuotes(value) {
  if (!value || typeof value !== 'object') return {}

  return Object.fromEntries(
    Object.entries(value).flatMap(([symbol, quote]) => {
      const price = Number.parseFloat(quote?.price)
      if (!Number.isFinite(price) || price <= 0) return []
      return [[symbol, { ...quote, price }]]
    }),
  )
}

export async function fetchMarketQuotes(symbols) {
  const normalizedSymbols = normalizeSymbols(symbols)

  if (!normalizedSymbols.length) {
    return { quotes: {}, asOf: '', error: '缺少 ticker，无法获取行情。' }
  }

  try {
    const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(normalizedSymbols.join(','))}`)
    const data = await response.json()

    return {
      quotes: normalizeQuotes(data?.quotes),
      asOf: typeof data?.asOf === 'string' ? data.asOf : '',
      error: response.ok ? '' : data?.error || '行情服务暂时不可用。',
    }
  } catch {
    return { quotes: {}, asOf: '', error: '网络异常，无法获取最新行情。' }
  }
}
