const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function parseDateParts(value) {
  const match = String(value || '').trim().slice(0, 10).match(DATE_PATTERN)
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

export function getContributionState({ plan, records = [], today } = {}) {
  const currentDay = parseDateParts(today)
  if (!plan || !currentDay) return { status: 'unknown', nextDate: null, nextPeriod: null, reason: 'invalid-today' }
  const totalPeriods = Number(plan.totalPeriods)
  const openEnded = plan.budgetMode === 'open-ended'
  if (!openEnded && (!Number.isSafeInteger(totalPeriods) || totalPeriods < 1 || totalPeriods > 10000)) {
    return { status: 'unknown', nextDate: null, nextPeriod: null, reason: 'invalid-periods' }
  }
  if (!['monthly', 'biweekly'].includes(plan.frequency)) return { status: 'unknown', nextDate: null, nextPeriod: null, reason: 'invalid-frequency' }
  const planRecords = (Array.isArray(records) ? records : []).filter(record => record.planId === plan.id)
  if (planRecords.length >= 5000) return { status: 'limited', nextDate: null, nextPeriod: null, reason: 'record-capacity' }
  const completedPeriods = planRecords.length
  if (!openEnded && completedPeriods >= totalPeriods) return { status: 'completed', nextDate: null, nextPeriod: null, reason: 'fixed-complete' }
  const latest = planRecords.slice().sort((a, b) => Number(b.periodIndex) - Number(a.periodIndex))[0]
  const latestDate = latest ? parseDateParts(latest.date) : null
  if (latest && !latestDate) return { status: 'unknown', nextDate: null, nextPeriod: completedPeriods + 1, reason: 'invalid-latest-date' }
  const created = parseDateParts(plan.createdAt)
  if (!latestDate && !created) return { status: 'unknown', nextDate: null, nextPeriod: completedPeriods + 1, reason: 'invalid-created-date' }
  const nextDate = getNextContributionDate({ createdAt: latestDate ? formatDateParts(latestDate) : formatDateParts(created), latestExecutionDate: latestDate ? formatDateParts(latestDate) : '', frequency: plan.frequency, completedPeriods })
  if (!nextDate) return { status: 'unknown', nextDate: null, nextPeriod: completedPeriods + 1, reason: 'invalid-next-date' }
  const status = nextDate < formatDateParts(currentDay) ? 'overdue' : nextDate === formatDateParts(currentDay) ? 'dueToday' : 'upcoming'
  return { status, nextDate, nextPeriod: completedPeriods + 1, reason: '' }
}
