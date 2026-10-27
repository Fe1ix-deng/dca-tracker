// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../i18n/index.jsx'
import Faq from './Faq'
import { FAQS_BY_LANGUAGE } from '../content/faq'

describe('FAQ metadata lifecycle', () => {
  it('keeps visible FAQ entries and JSON-LD in the same language and restores home metadata', async () => {
    localStorage.setItem('dca-tracker-language', 'en-US')
    const { unmount } = render(<I18nProvider><Faq onNavigate={() => {}} /></I18nProvider>)
    await waitFor(() => expect(document.documentElement.lang).toBe('en-US'))
    const schema = JSON.parse(document.getElementById('faq-jsonld').textContent)
    expect(schema.mainEntity.map(item => item.name)).toEqual(FAQS_BY_LANGUAGE['en-US'].map(item => item.question))
    expect(screen.getByRole('heading', { name: FAQS_BY_LANGUAGE['en-US'][0].question })).toBeVisible()
    expect(document.head.querySelector('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
    unmount()
    expect(document.title).toContain('DCA Tracker')
  })
})
