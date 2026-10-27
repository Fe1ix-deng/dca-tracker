import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMarketQuotes } from '../services/marketQuotes'
import { roundPrice } from '../utils/marketPrecision'
import { createRequestGuard } from '../utils/requestGuard'

export function normalizeManualPrice(value, marketOrPlan) {
  return roundPrice(value, marketOrPlan)
}

export async function fetchQuote(ticker, marketOrPlan, options = {}) {
  const symbol = String(ticker || '').trim().toUpperCase()
  if (!symbol) {
    return {
      price: null,
      error: '缺少 ticker，请手动输入价格。',
    }
  }

  try {
    const result = options?.signal
      ? await fetchMarketQuotes([symbol], options)
      : await fetchMarketQuotes([symbol])
    if (result.aborted || options.signal?.aborted) {
      return { price: null, error: '', aborted: true }
    }
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
  } catch (error) {
    if (error?.name === 'AbortError' || options.signal?.aborted) {
      return { price: null, error: '', aborted: true }
    }
    return {
      price: null,
      error: '网络异常，无法获取最新行情。',
    }
  }
}

export function useQuote(symbol, manualPrice, marketOrPlan) {
  const requestGuardRef = useRef(null)
  if (!requestGuardRef.current) requestGuardRef.current = createRequestGuard()
  const [state, setState] = useState({
    price: normalizeManualPrice(manualPrice, marketOrPlan),
    source: manualPrice ? 'manual' : 'idle',
    error: '',
    loading: false,
  })

  const refreshQuote = useCallback(async () => {
    const request = requestGuardRef.current.start()

    if (!symbol) {
      if (!request.isCurrent()) return null
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
      price: normalizeManualPrice(manualPrice, marketOrPlan),
      source: manualPrice ? 'manual' : 'idle',
      loading: true,
      error: '',
    }))

    const result = await fetchQuote(symbol, marketOrPlan, { signal: request.signal })
    if (!request.isCurrent() || result.aborted) return null

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
    const request = requestGuardRef.current.start()

    async function run() {
      if (!symbol) {
        if (!request.isCurrent()) return
        setState({
          price: normalizeManualPrice(manualPrice, marketOrPlan),
          source: 'manual',
          error: '缺少 ticker，请手动输入价格。',
          loading: false,
        })
        return
      }

      setState({
        price: normalizeManualPrice(manualPrice, marketOrPlan),
        source: manualPrice ? 'manual' : 'idle',
        loading: true,
        error: '',
      })

      const result = await fetchQuote(symbol, marketOrPlan, { signal: request.signal })
      if (!request.isCurrent() || result.aborted) return

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
      requestGuardRef.current.invalidate()
    }
  }, [manualPrice, marketOrPlan, symbol])

  useEffect(() => () => requestGuardRef.current?.invalidate(), [])

  return {
    ...state,
    refreshQuote,
  }
}
