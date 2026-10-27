export const CURRENT_RELEASE = {
  version: '2.7.1',
  date: '2026-10-28',
  items: [
    '本期操作仅支持整数股，建议股数向下取整，小数输入不可保存。',
    '精简卡片重复说明，修复资产权重布局。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
