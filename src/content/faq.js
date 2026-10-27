export const FAQS_BY_LANGUAGE = {
  'zh-CN': [
    { question: '这是投资建议吗？', answer: '不是投资建议，也不构成收益承诺。DCA Tracker 只帮助你记录计划和计算路径。' },
    { question: '数据和行情请求如何处理？', answer: '计划和记录保存在浏览器本地；自动行情可能延迟或失败，行情请求会把你输入的 ticker 发送到行情服务。' },
    { question: '计算是否包含全部费用和收益因素？', answer: '除非页面明确标注，计算不包含税费、手续费、滑点、分红和汇率影响。' },
    { question: '换设备或清除浏览器数据怎么办？', answer: '清除浏览器数据或更换设备前，请在历史页面导出 JSON；在新设备导入后可恢复计划和记录。' },
    { question: '支持 A 股吗？', answer: '支持 A 股代码识别，例如 600519.SS。自动行情主要用于美股，A 股可手动输入价格。' },
    { question: '可以管理多个计划吗？', answer: '可以。顶部计划选择器用于切换已有计划；创建新计划请从设置页或“创建第一份计划”入口开始。' },
    { question: 'VA 策略的目标收益率如何设置？', answer: '目标收益率只用于计算 VA 目标路径，可手动设置或参考自动测算，不代表未来收益。' },
  ],
  'en-US': [
    { question: 'Is this investment advice?', answer: 'No. DCA Tracker is not investment advice or a promise of returns; it helps you record plans and calculate paths.' },
    { question: 'How are my data and quote requests handled?', answer: 'Plans and records stay in your browser. Automatic quotes may be delayed or fail, and quote requests send the ticker you enter to the quote service.' },
    { question: 'Which costs and return factors are included?', answer: 'Unless the interface explicitly says otherwise, calculations exclude taxes, fees, commissions, slippage, dividends, and currency effects.' },
    { question: 'What if I clear browser data or change devices?', answer: 'Export a JSON backup from History before clearing browser data or changing devices, then import it on the new device.' },
    { question: 'Does it support China A-shares?', answer: 'It recognizes tickers such as 600519.SS. Automatic quotes are mainly for US stocks; A-share prices can be entered manually.' },
    { question: 'Can I manage multiple plans?', answer: 'Yes. The top selector switches between existing plans; start a new draft from Settings or the “Create your first plan” entry.' },
    { question: 'How should I set a VA target return?', answer: 'The target return only defines the VA path. Set it manually or use the estimate as a reference; it is not a forecast.' },
  ],
}

export function createFaqStructuredData(language = 'zh-CN') {
  const entries = FAQS_BY_LANGUAGE[language] || FAQS_BY_LANGUAGE['zh-CN']
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://dca.020023.xyz/faq#faq',
    url: 'https://dca.020023.xyz/faq',
    mainEntity: entries.map(({ question, answer }) => ({
      '@type': 'Question', name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  }
}
