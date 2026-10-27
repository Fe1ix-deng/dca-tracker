import { test, expect } from '@playwright/test'
test('@A existing app and FAQ mount in a real browser', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: '设置', exact: true }).first()).toBeVisible()
  await page.goto('/faq')
  await expect(page.getByRole('heading', { name: /常见问题/ }).first()).toBeVisible()
})
