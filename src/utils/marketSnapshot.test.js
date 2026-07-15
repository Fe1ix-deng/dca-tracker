import { describe, expect, it } from 'vitest'
import { getQuoteDisplayState, resolveMarketPrices } from './marketSnapshot'

describe('resolveMarketPrices', () => {
  it('uses a valid quote over the last execution price without mutating the recorded price map', () => {
    const recordedPrices = { QLD: 90, IBIT: 36 }

    expect(resolveMarketPrices(['QLD', 'IBIT'], recordedPrices, { QLD: { price: 92.19 } })).toEqual({
      QLD: { price: 92.19, source: 'quote' },
      IBIT: { price: 36, source: 'record' },
    })
    expect(recordedPrices).toEqual({ QLD: 90, IBIT: 36 })
  })
})

describe('getQuoteDisplayState', () => {
  it('labels an unavailable refresh as execution-date fallback when no quote succeeded', () => {
    expect(getQuoteDisplayState({ loading: false, error: '行情服务暂时不可用。', asOf: '', quoteCount: 0 })).toEqual({
      tone: 'fallback',
      text: '报价更新失败，显示执行日价格。',
    })
  })

  it('labels a partial refresh as stale when an earlier quote remains available', () => {
    expect(getQuoteDisplayState({ loading: false, error: '行情服务暂时不可用。', asOf: '2026-07-15T12:30:00.000Z', quoteCount: 1 })).toEqual({
      tone: 'stale',
      text: '部分报价更新失败，显示上次成功报价。',
    })
  })
})
