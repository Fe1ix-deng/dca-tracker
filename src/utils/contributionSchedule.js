const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDateParts(value) {
  const match = String(value || '').slice(0, 10).match(DATE_PATTERN)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null
  }

  return { year, month, day }
}

function formatDateParts({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getLastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function addMonths(parts, months) {
  const monthIndex = parts.month - 1 + months
  const year = parts.year + Math.floor(monthIndex / 12)
  const month = ((monthIndex % 12) + 12) % 12 + 1

  return {
    year,
    month,
    day: Math.min(parts.day, getLastDayOfMonth(year, month)),
  }
}

function addDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  date.setUTCDate(date.getUTCDate() + days)
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

export function getNextContributionDate({ createdAt, latestExecutionDate, frequency = 'monthly', completedPeriods = 0 } = {}) {
  const latestExecution = parseDateParts(latestExecutionDate)
  const start = latestExecution || parseDateParts(createdAt)
  const periods = Math.max(0, Number(completedPeriods) || 0)
  if (!start) return ''

  const hasLatestExecutionDate = Boolean(latestExecution)
  const nextDate = frequency === 'biweekly'
    ? addDays(start, hasLatestExecutionDate ? 14 : periods * 14)
    : addMonths(start, hasLatestExecutionDate ? 1 : periods)

  return formatDateParts(nextDate)
}

export function formatScheduleDate(value, language = 'zh-CN') {
  const parts = parseDateParts(value)
  if (!parts) return language === 'en-US' ? 'Not set' : '待设置'
  if (language === 'en-US') {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)))
  }
  return `${parts.year}年${parts.month}月${parts.day}日`
}
