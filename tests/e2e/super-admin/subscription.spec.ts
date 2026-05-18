import { test, expect } from "@playwright/test";
import path from "path";

const SUPER_ADMIN_AUTH = path.join(__dirname, "../../.auth/super-admin.json");

test.use({ storageState: SUPER_ADMIN_AUTH });

test("subscription card renders and modals open on restaurant detail", async ({ page }) => {
  // Navigate directly — super admin auth is pre-loaded
  await page.goto("/super-admin/restaurants");
  await page.waitForLoadState("networkidle");

  // Navigate to Saffron Palace detail — extract the View link href from the slug chip
  // The restaurants table shows slug chips as code text; find the View link adjacent to "saffron-palace"
  const saffronDetailHref = await page.evaluate(() => {
    // Find the element containing "saffron-palace" slug text
    const slugEls = Array.from(document.querySelectorAll("*")).filter(
      (el) => el.textContent?.trim() === "saffron-palace" && !el.querySelector("*")
    );
    if (!slugEls.length) return null;
    // Walk up to find a containing row/div that also has a View link
    for (const slugEl of slugEls) {
      let parent = slugEl.parentElement;
      for (let i = 0; i < 6 && parent; i++) {
        const link = parent.querySelector("a[href*='/super-admin/restaurants/']") as HTMLAnchorElement | null;
        if (link) return link.getAttribute("href");
        parent = parent.parentElement;
      }
    }
    return null;
  });

  if (!saffronDetailHref) throw new Error("Could not find Saffron Palace View link");
  await page.goto(saffronDetailHref);
  await page.waitForURL("**/super-admin/restaurants/**", { timeout: 8000 });
  await page.waitForLoadState("networkidle");

  // 1. Subscription card must be visible
  await expect(page.getByText("Subscription & Trial")).toBeVisible({ timeout: 5000 });

  // 2. At least one subscription status badge must be present
  const expired  = await page.getByText("Trial Expired").count();
  const active   = await page.getByText("Trial Active").count();
  const paid     = await page.getByText("Paid").count();
  const notrial  = await page.getByText("No trial").count();
  expect(expired + active + paid + notrial, "Expected a subscription status badge").toBeGreaterThan(0);

  // 3. Extend/Start Trial modal (label depends on whether restaurant has a trial)
  const extendBtn = page.getByRole("button", { name: /extend trial|start trial/i }).first();
  await expect(extendBtn).toBeVisible({ timeout: 3000 });
  await extendBtn.click();
  // Title is either "Extend Trial Period" or "Start Trial Period"
  await expect(page.getByText(/Extend Trial Period|Start Trial Period/)).toBeVisible({ timeout: 3000 });
  await expect(page.getByRole("button", { name: "+7 days" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+14 days" })).toBeVisible();
  await expect(page.getByRole("button", { name: "+30 days" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Extend Trial Period|Start Trial Period/)).not.toBeVisible({ timeout: 2000 });

  // 4. Activate Paid modal (only when not already paid)
  const activateBtn = page.getByRole("button", { name: /activate paid/i }).first();
  if (await activateBtn.isVisible()) {
    await activateBtn.click();
    await expect(page.getByText("Activate Paid Subscription")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("removes the trial expiry permanently")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Activate Paid Subscription")).not.toBeVisible({ timeout: 2000 });
  }
});
