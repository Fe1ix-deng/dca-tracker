// Keep the existing server-only quote service on Vercel. Never forward cookies.
export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname !== '/api/quotes') return env.ASSETS.fetch(request)
    if (request.method !== 'GET') return Response.json({ error: '只支持 GET 请求。' }, { status: 405, headers: { Allow: 'GET' } })
    const upstream = new URL('https://dca-tracker-steel.vercel.app/api/quotes')
    upstream.searchParams.set('symbols', url.searchParams.get('symbols') || '')
    try {
      return await fetch(upstream.toString())
    } catch {
      return Response.json({ error: '行情服务暂时不可用。' }, { status: 502 })
    }
  },
}
