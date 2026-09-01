export const CURRENT_RELEASE = {
  version: '2.5.1',
  date: '2026-09-01',
  items: [
    '移除本期操作页和固定预算历史页中重复的说明文字，让关键数据更集中。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
