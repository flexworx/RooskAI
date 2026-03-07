import { test, expect } from '@playwright/test'

test.describe('SEO & Meta', () => {
  test('homepage has correct meta tags', async ({ page }) => {
    await page.goto('/')
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc).toBeTruthy()
    expect(desc).toContain('Byrth')
  })

  test('robots.txt is accessible', async ({ page }) => {
    const res = await page.goto('/robots.txt')
    expect(res?.status()).toBe(200)
    const text = await res?.text()
    expect(text).toContain('User-agent')
    expect(text).toContain('Disallow: /dashboard/')
  })

  test('sitemap.xml is accessible', async ({ page }) => {
    const res = await page.goto('/sitemap.xml')
    expect(res?.status()).toBe(200)
    const text = await res?.text()
    expect(text).toContain('byrth.net')
  })

  test('JSON-LD structured data is present', async ({ page }) => {
    await page.goto('/')
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
    expect(jsonLd).toBeTruthy()
    const data = JSON.parse(jsonLd!)
    expect(data['@type']).toBe('Organization')
    expect(data.name).toBe('Byrth')
  })

  test('OG image endpoint responds', async ({ page }) => {
    const res = await page.goto('/api/og?title=Test')
    expect(res?.status()).toBe(200)
    const contentType = res?.headers()['content-type']
    expect(contentType).toContain('image')
  })
})
