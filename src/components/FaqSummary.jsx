import { ArrowRight } from 'lucide-react'
import { useI18n } from '../i18n/index.jsx'

export default function FaqSummary({ onNavigate }) {
  const { t } = useI18n()

  const handleClick = (event) => {
    event.preventDefault()
    onNavigate?.('faq')
  }

  return (
    <article className="section-card faq-summary">
      <div className="min-w-0">
        <p className="label">FAQ</p>
        <h2 className="mt-3 text-[1.05rem] font-semibold text-white">{t('VA定投计算器常见问题')}</h2>
        <p className="body-copy mt-2">
          {t('了解 VA 定投怎么算、目标收益率如何设置、数据如何备份，以及多计划和 A 股支持情况。')}
        </p>
      </div>
      <a href="/faq" onClick={handleClick} className="control-button faq-summary-link">
        {t('查看完整 FAQ')}
        <ArrowRight size={16} aria-hidden="true" />
      </a>
    </article>
  )
}
