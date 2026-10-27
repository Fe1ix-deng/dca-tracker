import { test, expect } from '@playwright/test'

for (const { width, language } of [{ width: 320, language: 'zh-CN' }, { width: 1440, language: 'zh-CN' }]) test(`@D ${width}px ${language} empty shell offers a direct create entry`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 320 ? 740 : 900 })
    if (language === 'en-US') {
      await page.addInitScript(() => localStorage.setItem('dca-tracker-language', 'en-US'))
    }
    await page.goto('/')
    if (language === 'en-US') await expect(page.locator('html')).toHaveAttribute('lang', 'en-US')
    await page.getByRole('button', { name: language === 'en-US' ? 'Read' : '已读', exact: true }).click().catch(() => {})
    const createName = language === 'en-US' ? 'Create your first plan' : '创建第一份计划'
    const create = width === 320
      ? page.locator('.mobile-topbar button').first()
      : page.getByRole('button', { name: createName, exact: true }).first()
    await expect(create).toBeVisible()
    if (width === 320) {
      const box = await create.boundingBox()
      expect(box?.y ?? Infinity).toBeLessThan(180)
    }
    await create.click()
    await expect(page.getByRole('textbox', { name: language === 'en-US' ? 'Name' : '名称', exact: true })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('dca-tracker:plans'))).toBeNull()
    await page.screenshot({ path: `docs/verification/2026-10-26-phase4/d-create-${width}-${language}.png`, fullPage: true })
    await info.attach(`d-create-${width}`, { body: JSON.stringify({ width, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth) }), contentType: 'application/json' })
})

test('@D sliders expose values and support keyboard focus', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '设置', exact: true }).first().click()
  await page.getByRole('button', { name: '添加标的', exact: true }).click()
  await page.getByRole('textbox', { name: '标的', exact: true }).fill('SPY')
  await page.getByRole('button', { name: '添加到计划', exact: true }).click()
  await page.getByRole('button', { name: '添加标的', exact: true }).click()
  const sliders = page.getByRole('slider')
  await expect(sliders).toHaveCount(4)
  for (let i = 0; i < await sliders.count(); i += 1) {
    const slider = sliders.nth(i)
    await slider.focus()
    await page.keyboard.press('Home')
    await page.keyboard.press('End')
    await expect(slider).toHaveAttribute('aria-valuetext', /%/)
    await expect(slider).toBeFocused()
  }
  await page.screenshot({ path: 'docs/verification/2026-10-26-phase4/d-sliders.png', fullPage: true })
})
