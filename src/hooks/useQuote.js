import { useCallback, useEffect, useState } from 'react'
import { fetchMarketQuotes } from '../services/marketQuotes'

function roundQuotePrice(value) {
  const numeric = Number.parseFloat(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : null
}

export async function fetchQuote(ticker) {
  const symbol = String(ticker || '').trim().toUpperCase()
  if (!symbol) {
    return {
      price: null,
      error: '缺少 ticker，请手动输入价格。',
    }
  }

  const result = await fetchMarketQuotes([symbol])
  const roundedPrice = roundQuotePrice(result.quotes?.[symbol]?.price)

  if (roundedPrice === null) {
    return {
      price: null,
      error: result.error || '获取失败，请手动输入。',
    }
  }

  return {
    price: roundedPrice,
    error: '',
  }
}

export function useQuote(symbol, manualPrice) {
  const [state, setState] = useState({
    price: Number(manualPrice) || 0,
    source: manualPrice ? 'manual' : 'idle',
    error: '',
    loading: false,
  })

  const refreshQuote = useCallback(async () => {
    if (!symbol) {
      setState({
        price: Number(manualPrice) || 0,
        source: 'manual',
        error: '缺少 ticker，请手动输入价格。',
        loading: false,
      })
      return null
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: '',
    }))

    const result = await fetchQuote(symbol)

    if (typeof result.price === 'number') {
      setState({
        price: result.price,
        source: 'auto',
        error: '',
        loading: false,
      })
      return result.price
    }

    setState({
      price: Number(manualPrice) || 0,
      source: 'manual',
      error: result.error || '获取失败，请手动输入。',
      loading: false,
    })
    return null
  }, [manualPrice, symbol])

  useEffect(() => {
    let active = true

    async function run() {
      if (!symbol) {
        setState({
          price: Number(manualPrice) || 0,
          source: 'manual',
          error: '缺少 ticker，请手动输入价格。',
          loading: false,
        })
        return
      }

      setState((current) => ({
        ...current,
        loading: true,
      }))

      const result = await fetchQuote(symbol)
      if (!active) return

      if (typeof result.price === 'number') {
        setState({
          price: result.price,
          source: 'auto',
          error: '',
          loading: false,
        })
        return
      }

      setState({
        price: Number(manualPrice) || 0,
        source: 'manual',
        error: result.error || '获取失败，请手动输入。',
        loading: false,
      })
    }

    run()

    return () => {
      active = false
    }
  }, [manualPrice, symbol])

  return {
    ...state,
    refreshQuote,
  }
}
