import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readProjectFile = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

describe('SEO and GEO static assets', () => {
  it('uses VA定投计算器 in the homepage title, description, and H1', () => {
    const html = readProjectFile('index.html')

    expect(html).toMatch(/<title>[^<]*VA定投计算器[^<]*<\/title>/)
    expect(html).toMatch(/<meta name="description" content="[^"]*VA定投计算器[^"]*"/)
    expect(html).toMatch(/<h1[^>]*>[^<]*VA定投计算器[^<]*<\/h1>/)
  })

  it('ships a crawlable FAQ document with dedicated metadata and FAQPage JSON-LD', () => {
    const html = readProjectFile('faq.html')

    expect(html).toContain('<title>VA定投常见问题')
    expect(html).toContain('name="description"')
    expect(html).toContain('id="faq-jsonld"')
    expect(html).toContain('"@type": "FAQPage"')
    expect(html).toContain('"@id": "https://dca.020023.xyz/faq#faq"')
    expect(html).toContain('"url": "https://dca.020023.xyz/faq"')
    expect(html).toContain('<h1>VA定投计算器常见问题</h1>')
  })

  it('publishes llms.txt and explicitly allows search-oriented AI crawlers', () => {
    const rootLlms = readProjectFile('llms.txt')
    const publicLlms = readProjectFile('public/llms.txt')
    const robots = readProjectFile('public/robots.txt')

    expect(publicLlms).toBe(rootLlms)
    expect(rootLlms).toContain('https://dca.020023.xyz/faq')
    for (const bot of ['OAI-SearchBot', 'PerplexityBot', 'Claude-SearchBot', 'ClaudeBot']) {
      expect(robots).toContain(`User-agent: ${bot}\nAllow: /`)
    }
  })

  it('builds FAQ as a separate HTML entry and rewrites /faq to it', () => {
    const viteConfig = readProjectFile('vite.config.js')
    const vercelConfig = readProjectFile('vercel.json')

    expect(viteConfig).toContain("faq: resolve(__dirname, 'faq.html')")
    expect(vercelConfig).toContain('"source": "/faq"')
    expect(vercelConfig).toContain('"destination": "/faq.html"')
  })

  it('restores homepage metadata after leaving FAQ in the SPA', () => {
    const faqSource = readProjectFile('src/components/Faq.jsx')

    expect(faqSource).toContain('document.title = HOME_META.title')
    expect(faqSource).toContain("canonical?.setAttribute('href', HOME_META.url)")
    expect(faqSource).toContain("setMetaContent('meta[name=\"description\"]', HOME_META.description)")
  })
})
