export function getTabFromPath(pathname = '/') {
  const normalizedPath = String(pathname).replace(/\/+$/, '') || '/'
  return normalizedPath === '/faq' || normalizedPath === '/faq.html' ? 'faq' : 'dashboard'
}

export function getPathForTab(tab) {
  return tab === 'faq' ? '/faq' : '/'
}
