import { describe, expect, it } from 'vitest'
import { formatScheduleDate, getNextContributionDate, getContributionState } from './contributionSchedule'

describe('contribution schedule helpers', () => {
  it('adds fourteen days for biweekly plans', () => {
    expect(getNextContributionDate({
      createdAt: '2026-08-12T09:30:00.000Z',
      frequency: 'biweekly',
      completedPeriods: 1,
    })).toBe('2026-08-26')
  })

  it('clamps monthly dates to the last day of shorter months', () => {
    expect(getNextContributionDate({
      createdAt: '2026-01-31T09:30:00.000Z',
      frequency: 'monthly',
      completedPeriods: 1,
    })).toBe('2026-02-28')

    expect(getNextContributionDate({
      createdAt: '2026-01-31T09:30:00.000Z',
      frequency: 'monthly',
      completedPeriods: 2,
    })).toBe('2026-03-31')
  })

  it('formats a valid date for the dashboard and leaves missing dates explicit', () => {
    expect(formatScheduleDate('2026-08-26')).toBe('2026年8月26日')
    expect(formatScheduleDate('')).toBe('待设置')
    expect(getNextContributionDate({ frequency: 'monthly', completedPeriods: 1 })).toBe('')
  })

  it('formats schedule dates for English', () => {
    expect(formatScheduleDate('2026-08-26', 'en-US')).toBe('Aug 26, 2026')
    expect(formatScheduleDate('', 'en-US')).toBe('Not set')
  })

  it('uses the latest actual execution date as the next schedule anchor', () => {
    expect(getNextContributionDate({
      createdAt: '2026-07-01T09:30:00.000Z',
      latestExecutionDate: '2026-07-30T09:30:00.000Z',
      frequency: 'biweekly',
      completedPeriods: 1,
    })).toBe('2026-08-13')
  })
  it.each([
    ['overdue', '2026-10-25', '2026-10-26', '2026-09-25'],
    ['dueToday', '2026-10-26', '2026-10-26', '2026-09-26'],
    ['upcoming', '2026-10-27', '2026-10-26', '2026-09-27'],
  ])('returns %s for local calendar comparison', (status, nextDate, today, latestDate) => {
    const state = getContributionState({ plan: { id: 'p', budgetMode: 'fixed', totalPeriods: 12, frequency: 'monthly', createdAt: latestDate }, records: [{ planId: 'p', periodIndex: 0, date: latestDate }], today })
    expect(state).toMatchObject({ status, nextDate })
  })
  it('distinguishes fixed completion, open ended plans, unknown dates and capacity', () => {
    const base = { id: 'p', budgetMode: 'fixed', totalPeriods: 1, frequency: 'monthly', createdAt: '2026-01-01' }
    expect(getContributionState({ plan: base, records: [{ planId: 'p', periodIndex: 0, date: '2026-01-01' }], today: '2026-02-01' }).status).toBe('completed')
    expect(getContributionState({ plan: { ...base, budgetMode: 'open-ended', totalPeriods: 9999 }, records: [{ planId: 'p', periodIndex: 0, date: '2026-01-01' }], today: '2026-03-01' }).status).toBe('overdue')
    expect(getContributionState({ plan: { ...base, totalPeriods: 2 }, records: [{ planId: 'p', periodIndex: 0, date: '2026-02-30' }], today: '2026-02-01' }).status).toBe('unknown')
    expect(getContributionState({ plan: { ...base, totalPeriods: 10000 }, records: Array.from({ length: 5000 }, (_, i) => ({ planId: 'p', periodIndex: i, date: '2026-01-01' })), today: '2026-02-01' }).status).toBe('limited')
  })
})
