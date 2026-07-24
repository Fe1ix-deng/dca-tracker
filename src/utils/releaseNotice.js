export const CURRENT_RELEASE = {
  version: '2.3.0',
  date: '2026-07-24',
  items: [
    '总览页现在会在更新后主动展示最新版本说明。',
    '点击“已读”后，说明会收束为右上角的铃铛入口。',
    '已读状态会保存在当前浏览器，新版本发布后会再次提醒。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
