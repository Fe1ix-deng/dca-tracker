import { useEffect, useState } from 'react'
import { getLocalDate } from '../utils/executionDate'

const defaultNowFactory = () => new Date()
function nextLocalMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return Math.max(1, next.getTime() - now.getTime())
}

export function useLocalDate(nowFactory = defaultNowFactory) {
  const [today, setToday] = useState(() => getLocalDate(nowFactory()))
  useEffect(() => {
    let timer
    const refresh = () => {
      setToday(getLocalDate(nowFactory()))
      clearTimeout(timer)
      timer = setTimeout(refresh, nextLocalMidnight(nowFactory()))
    }
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh() }
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [nowFactory])
  return today
}

export { nextLocalMidnight }
