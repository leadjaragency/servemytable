import { test, expect } from '../../fixtures/auth';

// The setup wizard is directly reachable at /admin/setup. These checks are
// read-only / navigation-only to avoid mutating the shared demo restaurant.
test.describe('Setup Wizard', () => {
  test('renders the stepper and all four steps', async ({ adminPage }) => {
    await adminPage.goto('/admin/setup');
    await expect(adminPage.locator('text=Finish setting up your restaurant')).toBeVisible();
    await expect(adminPage.locator('text=Location & contact')).toBeVisible();
    await expect(adminPage.locator('text=Hours & money')).toBeVisible();
    await expect(adminPage.locator('text=Brand & profile')).toBeVisible();
    await expect(adminPage.locator('text=Review & finish')).toBeVisible();
  });

  test('"Skip for now" leaves the wizard', async ({ adminPage }) => {
    await adminPage.goto('/admin/setup');
    await adminPage.click('text=Skip for now');
    await expect(adminPage).toHaveURL(/\/admin(\/)?$/, { timeout: 15_000 });
  });
});
