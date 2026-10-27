import { describe, expect, it } from 'vitest'
import { createRequestGuard } from './requestGuard'

describe('request guard', () => {
  it('keeps a slow earlier request from committing after a newer request starts', async () => {
    const guard = createRequestGuard()
    let committed = []
    const first = guard.start()
    const slowRequest = new Promise((resolve) => setTimeout(() => resolve('old price'), 20))
    const second = guard.start()
    const fastRequest = Promise.resolve('new price')

    const [oldPrice, newPrice] = await Promise.all([slowRequest, fastRequest])
    if (first.isCurrent()) committed.push(oldPrice)
    if (second.isCurrent()) committed.push(newPrice)

    expect(committed).toEqual(['new price'])
    expect(first.signal.aborted).toBe(true)
  })
})
