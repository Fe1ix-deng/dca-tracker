import { describe, expect, it } from 'vitest'
import { FAQS_BY_LANGUAGE, createFaqStructuredData } from './faq'

describe('FAQ content', () => {
  it('keeps the README questions available in Chinese and English', () => {
    expect(FAQS_BY_LANGUAGE['zh-CN']).toHaveLength(5)
    expect(FAQS_BY_LANGUAGE['en-US']).toHaveLength(5)
    expect(FAQS_BY_LANGUAGE['zh-CN'].map((item) => item.question)).toContain('VA 策略的目标收益率如何设置？')
  })

  it('creates valid FAQPage structured data from the visible questions', () => {
    const data = createFaqStructuredData('zh-CN')

    expect(data['@context']).toBe('https://schema.org')
    expect(data['@type']).toBe('FAQPage')
    expect(data['@id']).toBe('https://dca.020023.xyz/faq#faq')
    expect(data.url).toBe('https://dca.020023.xyz/faq')
    expect(data.mainEntity).toHaveLength(5)
    expect(data.mainEntity[0]).toMatchObject({
      '@type': 'Question',
      acceptedAnswer: { '@type': 'Answer' },
    })
  })
})
