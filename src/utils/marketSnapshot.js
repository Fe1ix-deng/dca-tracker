function positiveNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0
}

export function getLastRecordedPrices(records) {
  const prices = {}

  ;(Array.isArray(records) ? records : []).forEach((record) => {
    ;(Array.isArray(record?.assets) ? record.assets : []).forEach((asset) => {
      const ticker = String(asset?.ticker || '').trim().toUpperCase()
      const price = positiveNumber(asset?.price)
      if (ticker && price > 0) {
        prices[ticker] = price
      }
    })
  })

  return prices
}

export function resolveMarketPrices(assets, recordedPrices, quotes) {
  return Object.fromEntries((Array.isArray(assets) ? assets : []).map((asset) => {
    const ticker = String(typeof asset === 'string' ? asset : asset?.ticker || '').trim().toUpperCase()
    const quotePrice = positiveNumber(quotes?.[ticker]?.price)
    const recordedPrice = positiveNumber(recordedPrices?.[ticker])

    return [ticker, quotePrice > 0
      ? { price: quotePrice, source: 'quote' }
      : { price: recordedPrice, source: 'record' }]
  }))
}

export function getQuoteDisplayState({ loading, error, asOf, quoteCount }) {
  if (loading) {
    return { tone: 'loading', text: '正在更新报价。' }
  }

  if (error) {
    return quoteCount > 0
      ? { tone: 'stale', text: '部分报价更新失败，显示上次成功报价。' }
      : { tone: 'fallback', text: '报价更新失败，显示执行日价格。' }
  }

  if (asOf) {
    return { tone: 'fresh', text: '报价已更新。' }
  }

  return { tone: 'fallback', text: '显示执行日价格。' }
}
