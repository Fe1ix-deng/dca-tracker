export const CURRENT_RELEASE = {
  version: '2.4.0',
  date: '2026-08-13',
  items: [
    '新增拆股与合股事件记录，历史价格和股数会按最新股本口径自动重算。',
    '新增经典靛蓝、暖橙、松针绿和黑白灰四种强调色，并独立保存你的选择。',
    '总览页精简为市值、盈亏、执行进度和预算等核心指标，资产配置改为紧凑表格。',
    '总览页新增下一期预计日期、连续执行期数，以及暂停或漏投状态提示。',
    '重排本期操作确认卡片，将执行决策、金额摘要、备注和提交动作集中到清晰的单列流程。',
    '优化主题与计划选择器及移动端控件的对齐、定位、焦点和可读性。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
