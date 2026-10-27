import { test, expect } from '@playwright/test'
import { healthyPlan } from '../src/test/fixtures.js'

const dir = 'docs/verification/2026-10-26-phase4'
async function seed(page, plan) {
  await page.addInitScript(plan => {
    localStorage.setItem('dca-tracker:plans', JSON.stringify([plan]))
    localStorage.setItem('dca-tracker:active-plan-id', JSON.stringify(plan.id))
    localStorage.setItem('dca-tracker:records', JSON.stringify([]))
  }, plan)
}
async function runRoundTrip(page, info, timezone, splitEvents = []) {
  await page.setViewportSize({ width: 375, height: 812 })
  const plan = { ...healthyPlan, id: `roundtrip-${timezone}`, splitEvents, assets: [{ ...healthyPlan.assets[0], initialSharesOriginal: 0, currentShares: 0 }] }
  await seed(page, plan)
  await page.route('**/api/quotes?**', route => route.fulfill({ json: { quotes: { SPY: { price: 120 } } } }))
  await page.goto('/')
  await page.getByRole('button', { name: '已读', exact: true }).click().catch(() => {})
  await page.getByRole('button', { name: '本期操作', exact: true }).filter({ visible: true }).first().click()
  await expect(page.getByRole('textbox', { name: 'SPY 操作价格' })).toHaveValue('120')
  await page.getByRole('textbox', { name: 'SPY 实际买入股数' }).fill('2.5')
  await page.getByRole('button', { name: '确认记录本期操作' }).click()
  await expect(page.getByRole('heading', { name: '历史记录', exact: true })).toBeVisible()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出备份', exact: true }).click()
  const file = await download
  const path = await file.path()
  const savedPath = `${dir}/c-cross-timezone-${timezone.replaceAll('/', '-')}.json`
  await file.saveAs(savedPath)
  const exported = JSON.parse(await file.createReadStream().then(async stream => { let text = ''; for await (const chunk of stream) text += chunk; return text }))
  const rawRecord = exported.records.find(record => record.planId === plan.id)
  expect(rawRecord.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  expect(rawRecord.assets[0]).toMatchObject({ price: 120, actualShares: 2.5, actualAmount: 300 })
  await page.getByRole('button', { name: '设置', exact: true }).filter({ visible: true }).first().click()
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: '清除所有数据', exact: true }).click()
  await page.getByRole('button', { name: '历史', exact: true }).filter({ visible: true }).first().click()
  page.once('dialog', dialog => dialog.accept())
  await page.getByLabel('选择要导入的 JSON 备份文件').setInputFiles(path)
  await expect(page.getByRole('heading', { name: '历史记录', exact: true })).toBeVisible()
  await expect(page.getByRole('article').filter({ hasText: rawRecord.date }).first()).toContainText(rawRecord.date)
  await expect(page.getByRole('article').filter({ hasText: '$300' }).first()).toContainText('$300')
  await page.screenshot({ path: `${dir}/c-roundtrip-${timezone.replaceAll('/', '-')}.png`, fullPage: true })
  await info.attach(`c-roundtrip-${timezone}`, { body: JSON.stringify({ timezone, date: rawRecord.date, price: 120, shares: 2.5, amount: 300, splitEvents, path }), contentType: 'application/json' })
  return { path: savedPath, rawRecord }
}

test.describe('C1 Taipei real JSON round-trip', () => {
  test.use({ timezoneId: 'Asia/Taipei' })
  test('@C Taipei ordinary record keeps business values', async ({ page }, info) => {
    await runRoundTrip(page, info, 'Asia/Taipei')
  })
})
test.describe('C1 Los Angeles real JSON round-trip', () => {
  test.use({ timezoneId: 'America/Los_Angeles' })
  test('@C Los Angeles split-event record keeps raw values', async ({ page }, info) => {
    await runRoundTrip(page, info, 'America/Los_Angeles', [{ id: 'split-c', ticker: 'SPY', effectiveDate: '2099-01-01', newShares: 2, oldShares: 1 }])
  })
})


test('@C Taipei download imports unchanged in Los Angeles context', async ({ browser }, info) => {
  const taipei = await browser.newContext({ timezoneId: 'Asia/Taipei', acceptDownloads: true })
  const page = await taipei.newPage()
  const { path, rawRecord } = await runRoundTrip(page, info, 'Asia/Taipei')
  await taipei.close()
  const la = await browser.newContext({ timezoneId: 'America/Los_Angeles', acceptDownloads: true })
  const laPage = await la.newPage()
  await laPage.goto('/')
  await laPage.getByRole('button', { name: '历史', exact: true }).filter({ visible: true }).first().click()
  laPage.once('dialog', dialog => dialog.accept())
  await laPage.getByLabel('选择要导入的 JSON 备份文件').setInputFiles(path)
  await expect(laPage.getByRole('heading', { name: '历史记录', exact: true })).toBeVisible()
  const imported = await laPage.evaluate(() => JSON.parse(localStorage.getItem('dca-tracker:records'))[0])
  expect(imported.date).toBe(rawRecord.date)
  expect(imported.assets[0]).toMatchObject({ actualShares: 2.5, price: 120, actualAmount: 300 })
  await info.attach('c-taipei-to-la-business-values', { body: JSON.stringify({ date: imported.date, shares: imported.assets[0].actualShares, price: imported.assets[0].price, amount: imported.assets[0].actualAmount }), contentType: 'application/json' })
  await la.close()
})
