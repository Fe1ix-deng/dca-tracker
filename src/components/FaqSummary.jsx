import { ArrowRight } from 'lucide-react'
import { useI18n } from '../i18n/index.jsx'

export default function FaqSummary({ onNavigate, showCreate = false }) {
  const { t } = useI18n()

  const handleClick = (event) => {
    event.preventDefault()
    onNavigate?.('faq')
  }

  return (
    <article className="section-card faq-summary">
      <div className="min-w-0">

        <h2 className="text-[1.05rem] font-semibold text-white">{t('VA定投计算器常见问题')}</h2>

      </div>
      <div className="flex flex-wrap gap-2">
        {showCreate ? <button type="button" className="control-button-primary" onClick={() => onNavigate?.('settings')}>{t('创建第一份计划')}</button> : null}
        <a href="/faq" onClick={handleClick} className="control-button faq-summary-link">
          {t('查看完整 FAQ')}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </article>
  )
}
