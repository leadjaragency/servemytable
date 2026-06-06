import { test, expect } from '@playwright/test';

test.describe('Signup', () => {
  test('valid signup redirects to /auth/pending', async ({ page }) => {
    await page.goto('/auth/signup');

    // Use a unique email so it doesn't clash with seeded data on reruns
    const uniqueEmail = `testowner_${Date.now()}@example.com`;

    await page.fill('input[name="restaurantName"]', 'Test Bistro');
    await page.fill('input[name="cuisine"]', 'Italian');
    await page.fill('input[name="ownerName"]', 'Test Owner');
    await page.fill('input[name="email"]', uniqueEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.check('input[name="acceptTerms"]'); // required consent

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/auth\/pending/, { timeout: 15_000 });
  });

  test('duplicate email shows error', async ({ page }) => {
    await page.goto('/auth/signup');

    await page.fill('input[name="restaurantName"]', 'Duplicate Place');
    await page.fill('input[name="cuisine"]', 'Mexican');
    await page.fill('input[name="ownerName"]', 'Dup Owner');
    await page.fill('input[name="email"]', 'owner@saffronpalace.com'); // already seeded
    await page.fill('input[name="password"]', 'password123');
    await page.check('input[name="acceptTerms"]'); // required consent

    await page.click('button[type="submit"]');
    await expect(page.locator('text=/already|exists|registered/i').first()).toBeVisible({ timeout: 10_000 });
  });

  test('missing required fields shows Zod validation errors', async ({ page }) => {
    await page.goto('/auth/signup');
    await page.click('button[type="submit"]');
    // At least one validation error from the Zod schema should appear
    const errors = page.locator('[role="alert"], p.text-red, .text-red-500, .text-destructive');
    await expect(errors.first()).toBeVisible();
  });
});
