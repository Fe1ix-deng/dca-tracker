import { test, expect } from '@playwright/test'

test('@D FAQ language updates visible text and metadata on one canonical route', async ({ page }) => {
  await page.goto('/faq')
  await expect(page).toHaveURL(/\/faq$/)
  await expect(page.getByRole('heading', { name: '这是投资建议吗？' })).toBeVisible()
  await page.getByRole('button', { name: 'English', exact: true }).first().click()
  await expect(page.getByRole('heading', { name: 'Is this investment advice?' })).toBeVisible()
  await expect(page).toHaveURL(/\/faq$/)
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
  const schema = await page.locator('#faq-jsonld').textContent()
  expect(JSON.parse(schema).mainEntity[0].name).toBe('Is this investment advice?')
  await page.getByRole('button', { name: 'Overview', exact: true }).first().click()
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US')
})
