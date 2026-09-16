export const FAQS_BY_LANGUAGE = {
  'zh-CN': [
    {
      question: '数据安全吗？',
      answer: '所有数据保存在你的浏览器本地，不会上传到任何服务器。建议定期在“历史”页面导出 JSON 备份。',
    },
    {
      question: '支持 A 股吗？',
      answer: '支持 A 股代码识别，例如 600519.SS。自动获取价格目前主要用于美股，A 股用户可以手动输入价格。',
    },
    {
      question: '换设备后数据会丢失吗？',
      answer: '数据存储在当前浏览器本地。换设备前请导出 JSON 备份，再在新设备中导入即可恢复计划和历史记录。',
    },
    {
      question: '可以同时管理多个计划吗？',
      answer: '可以。页面顶部的计划下拉框支持创建、保存和切换多个相互独立的定投计划。',
    },
    {
      question: 'VA 策略的目标收益率如何设置？',
      answer: '你可以手动设定，也可以点击“自动测算”，根据组合资产的历史表现得到参考值。目标收益率只用于计算 VA 目标路径，不代表实际收益，也不是收益承诺。',
    },
  ],
  'en-US': [
    {
      question: 'Is my data safe?',
      answer: 'All data stays in your browser and is not uploaded to a server. Export a JSON backup from History regularly.',
    },
    {
      question: 'Does the calculator support China A-shares?',
      answer: 'It recognizes A-share tickers such as 600519.SS. Automatic quotes are primarily available for US stocks, while A-share prices can be entered manually.',
    },
    {
      question: 'Will I lose data when switching devices?',
      answer: 'Data is stored in the current browser. Export a JSON backup before switching devices and import it on the new device to restore plans and history.',
    },
    {
      question: 'Can I manage multiple investment plans?',
      answer: 'Yes. The plan selector at the top lets you create, save, and switch between independent plans.',
    },
    {
      question: 'How should I set the target return for a VA strategy?',
      answer: 'Set it manually or use the automatic estimate based on historical portfolio performance. It only defines the value averaging target path and is not a forecast or guarantee.',
    },
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
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  }
}
