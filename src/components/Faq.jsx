import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { FAQS_BY_LANGUAGE, createFaqStructuredData } from '../content/faq'
import { useI18n } from '../i18n/index.jsx'

const FAQ_META = {
  'zh-CN': {
    title: 'VA定投常见问题：怎么算、收益率怎么设、数据安全吗？ | DCA Tracker',
    description: 'VA定投计算器常见问题解答：VA定投怎么算、目标收益率如何设置、数据是否安全、如何备份和换设备，以及是否支持A股和多个计划。',
  },
  'en-US': {
    title: 'Value Averaging Calculator FAQ | DCA Tracker',
    description: 'Answers about value averaging calculations, target returns, local data storage, backups, multiple plans, and China A-share support.',
  },
}

const HOME_META = {
  title: 'VA定投计算器与 DCA Tracker - 美股定投记录复盘工具',
  description: '免费的VA定投计算器与美股DCA定投管理工具，支持价值平均策略、自动计算买入金额、投资轨迹复盘和多资产组合，数据仅保存在浏览器本地，无需注册。',
  url: 'https://dca.020023.xyz/',
}

function setMetaContent(selector, content) {
  const element = document.head.querySelector(selector)
  if (!element) return null
  element.setAttribute('content', content)
}

export default function Faq({ onNavigate }) {
  const { language, t } = useI18n()
  const entries = FAQS_BY_LANGUAGE[language] || FAQS_BY_LANGUAGE['zh-CN']

  useEffect(() => {
    const metadata = FAQ_META[language] || FAQ_META['zh-CN']
    const canonical = document.head.querySelector('link[rel="canonical"]')
    setMetaContent('meta[name="description"]', metadata.description)
    setMetaContent('meta[name="title"]', metadata.title)
    setMetaContent('meta[property="og:title"]', metadata.title)
    setMetaContent('meta[property="og:description"]', metadata.description)
    setMetaContent('meta[property="og:url"]', 'https://dca.020023.xyz/faq')
    setMetaContent('meta[name="twitter:title"]', metadata.title)
    setMetaContent('meta[name="twitter:description"]', metadata.description)
    setMetaContent('meta[name="twitter:url"]', 'https://dca.020023.xyz/faq')

    document.title = metadata.title
    canonical?.setAttribute('href', 'https://dca.020023.xyz/faq')

    const existingSchema = document.getElementById('faq-jsonld')
    const schema = existingSchema || document.createElement('script')
    schema.id = 'faq-jsonld'
    schema.type = 'application/ld+json'
    schema.textContent = JSON.stringify(createFaqStructuredData(language))
    if (!existingSchema) document.head.appendChild(schema)

    return () => {
      document.title = HOME_META.title
      setMetaContent('meta[name="description"]', HOME_META.description)
      setMetaContent('meta[name="title"]', HOME_META.title)
      setMetaContent('meta[property="og:title"]', HOME_META.title)
      setMetaContent('meta[property="og:description"]', HOME_META.description)
      setMetaContent('meta[property="og:url"]', HOME_META.url)
      setMetaContent('meta[name="twitter:title"]', HOME_META.title)
      setMetaContent('meta[name="twitter:description"]', HOME_META.description)
      setMetaContent('meta[name="twitter:url"]', HOME_META.url)
      canonical?.setAttribute('href', HOME_META.url)
      schema.remove()
    }
  }, [language])

  const handleBack = (event) => {
    event.preventDefault()
    onNavigate?.('dashboard')
  }

  return (
    <section className="section-shell faq-page">
      <header className="card faq-header">
        <p className="label">FAQ</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">{t('VA定投计算器常见问题')}</h1>
        <p className="body-copy mt-3 max-w-3xl">
          {t('集中解答 VA 价值平均策略、目标收益率、数据安全、备份恢复和多计划管理等常见问题。')}
        </p>
      </header>

      <div className="faq-list">
        {entries.map(({ question, answer }, index) => (
          <article key={question} className="section-card faq-item">
            <p className="mini-kicker">{t('问题')} {String(index + 1).padStart(2, '0')}</p>
            <h2 className="mt-3 text-[1.05rem] font-semibold text-white">{question}</h2>
            <p className="body-copy mt-3">{answer}</p>
          </article>
        ))}
      </div>

      <a href="/" onClick={handleBack} className="control-button faq-back-link">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('返回总览')}
      </a>
    </section>
  )
}
