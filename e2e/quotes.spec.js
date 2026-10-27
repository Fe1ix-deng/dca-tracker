import { test, expect } from '@playwright/test'
import { healthyPlan, healthyRecord } from '../src/test/fixtures.js'

const dir = 'docs/verification/2026-10-26-phase4'
async function seed(page, plan, records) {
  await page.addInitScript(({ plan, records }) => {
    localStorage.setItem('dca-tracker:plans', JSON.stringify([plan]))
    localStorage.setItem('dca-tracker:active-plan-id', JSON.stringify(plan.id))
    localStorage.setItem('dca-tracker:records', JSON.stringify(records))
  }, { plan, records })
}
async function evidence(page, info, name) {
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true })
  await info.attach(name, {
    body: JSON.stringify(await page.evaluate(() => ({
      url: location.href, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      viewport: { width: innerWidth, height: innerHeight },
      overflow: document.documentElement.scrollWidth > innerWidth,
      text: document.body.innerText,
    })), null, 2), contentType: 'application/json',
  })
}
function portfolioFixture(missingPrice = false) {
  const plan = { ...healthyPlan, currentPeriod: 1, assets: [
    { ...healthyPlan.assets[0], weight: .5, initialSharesOriginal: 0, currentShares: 2 },
    { ticker: 'QQQ', name: 'QQQ', weight: .5, initialSharesOriginal: 0, initialShares: 0, initialAverageCost: 0, currentShares: 10 },
  ], splitEvents: [{ id: 'qqq-split', ticker: 'QQQ', effectiveDate: '2026-02-01', newShares: 2, oldShares: 1 }] }
  const record = { ...healthyRecord, assets: [
    { ticker: 'SPY', price: 120, actualShares: 2, actualAmount: 240, priceSource: 'auto' },
    { ticker: 'QQQ', ...(missingPrice ? {} : { price: 120 }), actualShares: 10, actualAmount: 1200, priceSource: 'manual' },
  ], totalActualAmount: 1440 }
  return { plan, record }
}

test('@B mixed automatic and split-adjusted historical sources retain dates and values through failed refresh', async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  const { plan, record } = portfolioFixture()
  await seed(page, plan, [record])
  let calls = 0, release
  await page.route('**/api/quotes?**', async route => {
    if (++calls === 1) return route.fulfill({ json: { asOf: '2000-01-01T00:00:00Z', quotes: { SPY: { price: 150 } } } })
    await new Promise(resolve => { release = resolve })
    await route.fulfill({ status: 503, json: { error: '行情服务暂时不可用。' } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '已读', exact: true }).click()
  await expect(page.getByText('使用混合来源或不同时间的价格。', { exact: true })).toBeVisible()
  const total = page.getByRole('region', { name: '组合估值' })
  await expect(total).toContainText('1,500')
  await expect(total).toContainText('参考估值，非实时。')
  const spy = page.locator('.dashboard-allocation-table-row').filter({ hasText: 'SPY' })
  const qqq = page.locator('.dashboard-allocation-table-row').filter({ hasText: 'QQQ' })
  await expect(qqq).toContainText('手动记录价格')
  await expect(qqq).toContainText('采用记录执行日：2026-01-02')
  await expect(qqq).toContainText('累计因子 2')
  await expect(qqq).toContainText('价格 60')
  await expect(qqq).toContainText('20 股')
  await expect(spy).toContainText('行情时间未提供，可能延迟。')
  const time = await spy.getByText(/最后成功获取时间：/).innerText()
  expect(time).not.toContain('2000')
  await evidence(page, info, 'b-mixed-split-desktop')
  await page.locator('.dashboard-allocation-table').screenshot({ path: `${dir}/b-mixed-split-sources.png` })
  await page.getByRole('button', { name: '刷新市场报价' }).click()
  await expect(page.getByRole('button', { name: '刷新市场报价' })).toBeDisabled()
  await expect(total).toContainText('1,500')
  await expect(spy.getByText(/最后成功获取时间：/)).toHaveText(time)
  await expect.poll(() => typeof release).toBe('function')
  release()
  await expect(page.getByRole('button', { name: '刷新市场报价' })).toBeEnabled()
  await expect(spy).toContainText('本标的获取失败，未更新价格及成功时间。')
  await expect(spy.getByText(/最后成功获取时间：/)).toHaveText(time)
  await expect(total).toContainText('1,500')
  await evidence(page, info, 'b-failed-refresh-retains-values')
  const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('dca-tracker:records'))[0])
  expect(raw.assets[1]).toMatchObject({ price: 120, actualShares: 10, actualAmount: 1200 })
  expect(raw.totalActualAmount).toBe(1440)
})

test('@B missing raw price on a positive holding withholds complete value and profit', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const { plan, record } = portfolioFixture(true)
  await seed(page, plan, [record])
  await page.route('**/api/quotes?**', route => route.fulfill({ json: { quotes: { SPY: { price: 150 } } } }))
  await page.goto('/')
  await page.getByRole('button', { name: '已读', exact: true }).click()
  await expect(page.getByText('本次获取 1/2，部分失败', { exact: false })).toBeVisible()
  const total = page.getByRole('region', { name: '组合估值' })
  await expect(total.getByText('--', { exact: true })).toHaveCount(2)
  await expect(total).toContainText('估值不完整：1 个持仓资产缺少可靠价格或持仓口径。')
  await expect(page.locator('.dashboard-allocation-table-row').filter({ hasText: 'QQQ' })).toContainText('不可可靠估值')
  await evidence(page, info, 'b-incomplete-valuation-mobile')
})

test('@B manual invalid input survives a late response and failed retry until explicit successful retry', async ({ page }, info) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page, { ...healthyPlan, currentPeriod: 1, assets: [{ ...healthyPlan.assets[0], initialSharesOriginal: 0, currentShares: 2.5 }] }, [healthyRecord])
  let mode = 'success', release
  await page.route('**/api/quotes?**', async route => {
    if (mode === 'late') {
      await new Promise(resolve => { release = resolve })
      return route.fulfill({ json: { quotes: { SPY: { price: 999 } } } })
    }
    if (mode === 'failure') return route.fulfill({ status: 503, json: { error: '行情服务暂时不可用。' } })
    return route.fulfill({ json: { quotes: { SPY: { price: 160 } } } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '已读', exact: true }).click()
  await page.getByRole('button', { name: '本期操作', exact: true }).filter({ visible: true }).first().click()
  const input = page.getByRole('textbox', { name: 'SPY 操作价格' })
  await expect(input).toHaveValue('160')
  mode = 'late'
  await page.getByRole('button', { name: '自动获取价格', exact: true }).click()
  await expect.poll(() => typeof release).toBe('function')
  await input.fill('12abc')
  release()
  await expect(input).toHaveValue('12abc')
  await expect(page.getByRole('button', { name: '确认记录本期操作' })).toBeDisabled()
  mode = 'failure'
  await page.getByRole('button', { name: '自动获取价格', exact: true }).click()
  await expect(page.getByText('本标的获取失败，未更新价格及成功时间。', { exact: true })).toBeVisible()
  await expect(input).toHaveValue('12abc')
  await evidence(page, info, 'b-manual-override-mobile')
  mode = 'success'
  await page.getByRole('button', { name: '自动获取价格', exact: true }).click()
  await expect(input).toHaveValue('160')
  await page.getByRole('textbox', { name: 'SPY 实际买入股数' }).fill('2')
  await page.getByRole('button', { name: '确认记录本期操作' }).click()
  await expect(page.getByRole('heading', { name: '历史记录', exact: true })).toBeVisible()
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem('dca-tracker:records')))
  expect(records).toHaveLength(2)
  expect(records.find(record => record.id !== 'record-a').assets[0]).toMatchObject({ price: 160, actualShares: 2, actualAmount: 320, priceSource: 'auto' })
  expect(records.find(record => record.id === 'record-a').assets[0]).toMatchObject({ price: 120, actualShares: 2.5, actualAmount: 300 })
  await evidence(page, info, 'b-retry-record-provenance')
})
