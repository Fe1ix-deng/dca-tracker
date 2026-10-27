export function parseCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1] ? value : null
}
export function parseExecutionDate(value) {
  const normalized = typeof value === 'string' ? value.trim() : value
  const date = parseCalendarDate(normalized)
  if (date) return date
  if (typeof normalized !== 'string') return null
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{3})?(Z|[+-]\d{2}:\d{2})$/.exec(normalized)
  if (!match || !parseCalendarDate(match[1]) || +match[2] > 23 || +match[3] > 59 || +match[4] > 59) return null
  if (match[5] !== 'Z') {
    const [hours, minutes] = match[5].slice(1).split(':').map(Number)
    if (hours > 14 || minutes > 59 || (hours === 14 && minutes !== 0)) return null
  }
  return match[1]
}
export function getLocalDate(now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return null
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function getCreatedLocalDate(value) {
  if (!parseExecutionDate(value)) return null
  return parseCalendarDate(value) || getLocalDate(new Date(value))
}
