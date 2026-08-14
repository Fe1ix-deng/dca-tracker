export const CURRENT_RELEASE = {
  version: '2.4.1',
  date: '2026-08-14',
  items: [
    '设置页固定保存计划开始前的原有持仓股数与成本，定投后的累计持仓不再覆盖用户输入。',
    '修复 VA 定投把原有持仓误计入计划内仓位，导致建议金额和建议股数错误的问题。',
    '修复行情更新失败时的历史价格回退，多个标的会分别使用各自最近一次有效价格。',
    '修复固定预算建议股数可能超过剩余预算、双周收益换算和下一期日期计算的问题。',
    '修复拆股后的历史股数、价格、成本和 VA 计划内仓位显示。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
