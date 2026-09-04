export const CURRENT_RELEASE = {
  version: '2.6.0',
  date: '2026-09-04',
  items: [
    '移除本期操作页和固定预算历史页中重复的说明文字，让关键数据更集中。',
    '新增单独删除当前计划的入口，并同步清理该计划的历史记录。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
