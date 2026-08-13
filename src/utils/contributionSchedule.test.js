import { describe, expect, it } from 'vitest'
import { formatScheduleDate, getNextContributionDate } from './contributionSchedule'

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
})
