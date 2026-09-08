export const CURRENT_RELEASE = {
  version: '2.6.1',
  date: '2026-09-08',
  items: [
    '新增完整 SEO 元数据、社交媒体预览图和搜索引擎配置文件。',
  ],
}

export function shouldShowReleaseNotice(lastReadVersion, currentVersion = CURRENT_RELEASE.version) {
  return lastReadVersion !== currentVersion
}
