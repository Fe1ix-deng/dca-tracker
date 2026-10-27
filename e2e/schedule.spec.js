import { test, expect } from '@playwright/test'
import { healthyPlan, healthyRecord } from '../src/test/fixtures.js'

test('@C fixed completion removes the next operation entry in a real browser', async ({ page }) => {
  const plan = { ...healthyPlan, totalPeriods: 1, currentPeriod: 1 }
  await page.addInitScript(({ plan, record }) => {
    localStorage.setItem('dca-tracker:plans', JSON.stringify([plan]))
    localStorage.setItem('dca-tracker:active-plan-id', JSON.stringify(plan.id))
    localStorage.setItem('dca-tracker:records', JSON.stringify([record]))
  }, { plan, record: { ...healthyRecord, periodIndex: 0 } })
  await page.goto('/')
  await page.getByRole('button', { name: '已读', exact: true }).click().catch(() => {})
  await expect(page.getByText('计划已完成', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: '进入本期操作', exact: true })).toHaveCount(0)
  await page.screenshot({ path: 'docs/verification/2026-10-26-phase4/c-fixed-complete.png', fullPage: true })
})

test('@C overdue state is explicit and keeps the operation entry', async ({ page }) => {
  const plan = { ...healthyPlan, createdAt: '2020-01-01', currentPeriod: 1 }
  await page.addInitScript(({ plan, record }) => {
    localStorage.setItem('dca-tracker:plans', JSON.stringify([plan]))
    localStorage.setItem('dca-tracker:active-plan-id', JSON.stringify(plan.id))
    localStorage.setItem('dca-tracker:records', JSON.stringify([record]))
  }, { plan, record: { ...healthyRecord, date: '2020-01-01', periodIndex: 0 } })
  await page.goto('/')
  await page.getByRole('button', { name: '已读', exact: true }).click().catch(() => {})
  await expect(page.getByText('下一期已逾期，请核对是否尚未记录。', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '进入本期操作', exact: true })).toBeVisible()
  await page.screenshot({ path: 'docs/verification/2026-10-26-phase4/c-overdue-state.png', fullPage: true })
})


test('@C local date refreshes across midnight and focus restoration', async ({ page }) => {
  await page.addInitScript(() => {
    const plan = { id: 'clock-plan', name: 'Clock plan', strategy: 'DCA', market: 'US', budgetMode: 'open-ended', totalBudget: 0, reserveRatio: 0, totalPeriods: 9999, periodicTarget: 0, currentPeriod: 0, frequency: 'monthly', targetAnnualReturn: 0, createdAt: '2026-01-01T00:00:00.000Z', splitEvents: [], assets: [{ ticker: 'SPY', name: 'SPY', weight: 1, currentShares: 0, initialShares: 0, initialAverageCost: 0 }] }
    localStorage.setItem('dca-tracker:plans', JSON.stringify([plan]))
    localStorage.setItem('dca-tracker:active-plan-id', JSON.stringify(plan.id))
    localStorage.setItem('dca-tracker:records', JSON.stringify([]))
  })
  await page.clock.install({ time: new Date('2026-10-26T23:59:50-07:00') })
  await page.goto('/')
  await page.getByRole('button', { name: '本期操作', exact: true }).first().click()
  const date = page.getByRole('textbox', { name: '执行日期', exact: true })
  await page.clock.fastForward(20_000)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(date).toHaveValue('2026-10-27')
})
