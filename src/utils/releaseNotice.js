export const CURRENT_RELEASE = {
  version: '2.4.2',
  date: '2026-08-18',
  items: [
    '支持在没有计划时直接导入 JSON 备份，并恢复之前的计划和定投历史记录。',
    '导入备份现在会完整替换当前计划列表，避免恢复时残留临时计划。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
