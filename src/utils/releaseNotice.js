export const CURRENT_RELEASE = {
  version: '2.7.0',
  date: '2026-10-28',
  items: [
    '保存校验更清晰，保存失败时保留草稿，并保护已有记录的资产关联。',
    '行情逐标的显示来源与获取时间，拆合股估值统一口径，缺价时不显示完整盈亏。',
    '统一执行日期与备份恢复，增加到期提醒、创建入口和滑杆键盘支持。',
    '更新中英文 FAQ 与隐私说明，改善窄屏布局。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
