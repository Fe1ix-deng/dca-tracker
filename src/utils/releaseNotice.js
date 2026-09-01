export const CURRENT_RELEASE = {
  version: '2.5.0',
  date: '2026-09-01',
  items: [
    '支持在计划级别选择美股或 A 股，并按市场规则保留价格精度。',
    'A 股价格输入、行情报价、历史记录和重建计算支持三位小数。',
    '新增中英文界面切换，语言选择会在刷新后保留。',
    '更新发布提示内容，点击顶部铃铛即可随时查看本版本更新。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
