import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/dashboard')
    // Should render login form
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('login form has email and password fields', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('input[type="email"], input[type="text"]').first()).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('dashboard sub-routes redirect to login', async ({ page }) => {
    const routes = ['/dashboard/vms', '/dashboard/security', '/dashboard/monitoring']
    for (const route of routes) {
      await page.goto(route)
      // Should show login since not authenticated
      await expect(page.locator('input[type="password"]')).toBeVisible()
    }
  })
})
