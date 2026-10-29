export const CURRENT_RELEASE = {
  version: '2.7.1',
  date: '2026-10-28',
  items: [
    '建议股数向下取整，实际买入股数支持两位小数。',
    '精简卡片重复说明，修复资产权重布局。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
