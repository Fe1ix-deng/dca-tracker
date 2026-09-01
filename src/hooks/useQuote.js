import { useCallback, useEffect, useState } from 'react'
import { fetchMarketQuotes } from '../services/marketQuotes'
import { roundPrice } from '../utils/marketPrecision'

export function normalizeManualPrice(value, marketOrPlan) {
  return roundPrice(value, marketOrPlan)
}

export async function fetchQuote(ticker, marketOrPlan) {
  const symbol = String(ticker || '').trim().toUpperCase()
  if (!symbol) {
    return {
      price: null,
      error: '缺少 ticker，请手动输入价格。',
    }
  }

  try {
    const result = await fetchMarketQuotes([symbol])
    const numericPrice = Number.parseFloat(result.quotes?.[symbol]?.price)
    const roundedPrice = Number.isFinite(numericPrice) ? roundPrice(numericPrice, marketOrPlan) : null

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
  } catch {
    return {
      price: null,
      error: '网络异常，无法获取最新行情。',
    }
  }
}

export function useQuote(symbol, manualPrice, marketOrPlan) {
  const [state, setState] = useState({
    price: normalizeManualPrice(manualPrice, marketOrPlan),
    source: manualPrice ? 'manual' : 'idle',
    error: '',
    loading: false,
  })

  const refreshQuote = useCallback(async () => {
    if (!symbol) {
      setState({
        price: normalizeManualPrice(manualPrice, marketOrPlan),
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

    const result = await fetchQuote(symbol, marketOrPlan)

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
      price: normalizeManualPrice(manualPrice, marketOrPlan),
      source: 'manual',
      error: result.error || '获取失败，请手动输入。',
      loading: false,
    })
    return null
  }, [manualPrice, marketOrPlan, symbol])

  useEffect(() => {
    let active = true

    async function run() {
      if (!symbol) {
        setState({
          price: normalizeManualPrice(manualPrice, marketOrPlan),
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

      const result = await fetchQuote(symbol, marketOrPlan)
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
        price: normalizeManualPrice(manualPrice, marketOrPlan),
        source: 'manual',
        error: result.error || '获取失败，请手动输入。',
        loading: false,
      })
    }

    run()

    return () => {
      active = false
    }
  }, [manualPrice, marketOrPlan, symbol])

  return {
    ...state,
    refreshQuote,
  }
}
