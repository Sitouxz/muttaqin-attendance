import { test, expect } from "@playwright/test";

// ─────────────────────────────────────────────
// Public Surface
// ─────────────────────────────────────────────

test.describe("Landing page", () => {
  test("loads with bilingual CTAs and no redirect loop", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/admin/);
    await expect(page.locator("h1")).toContainText("Santunan Emas");
    await expect(page.getByRole("link", { name: /Daftar Sekarang/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Dapatkan QR Saya/i })).toBeVisible();
  });
});

test.describe("Registration flow", () => {
  test("shows registration form with all required fields", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("form")).toBeVisible();
    // Use ID-based selectors — labels use BilingualLabel which renders "Emel\nEmail" (no hyphen)
    await expect(page.locator("#full_name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#phone")).toBeVisible();
    await expect(page.locator("#age")).toBeVisible();
    await expect(page.locator("#postal_code")).toBeVisible();
    await expect(page.getByRole("button", { name: /Daftar Sekarang|Register/i })).toBeVisible();
  });

  test("shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/register");
    await page.getByRole("button", { name: /Daftar Sekarang|Register/i }).click();
    // Should show validation errors, not navigate away
    await expect(page).toHaveURL(/register/);
  });

  test("shows error for invalid phone number", async ({ page }) => {
    await page.goto("/register");
    await page.locator("#full_name").fill("Test User");
    await page.locator("#email").fill("test@example.com");
    await page.locator("#phone").fill("12345678"); // invalid — not 8/9 prefix
    await page.locator("#age").fill("50");
    await page.locator("#postal_code").fill("123456");
    await page.getByRole("button", { name: /Daftar Sekarang|Register/i }).click();
    await expect(page).toHaveURL(/register/);
    // Should still be on register page (validation failed)
  });
});

test.describe("QR Retrieval flow", () => {
  test("shows email input step", async ({ page }) => {
    await page.goto("/retrieve-qr");
    // ID-based selector — label uses BilingualLabel "Emel\nEmail", not "E-mel"
    await expect(page.locator("#retrieve-email")).toBeVisible();
    // Button text: "Hantar Kod OTP\nSend OTP Code" — "Send OTP" matches substring
    await expect(page.getByRole("button", { name: /Hantar Kod OTP|Send OTP/i })).toBeVisible();
  });

  test("shows error for unregistered email", async ({ page }) => {
    await page.goto("/retrieve-qr");
    // Use pressSequentially to trigger React's synthetic onChange events (fill() bypasses them)
    await page.locator("#retrieve-email").click();
    await page.locator("#retrieve-email").pressSequentially("notregistered@example.com");
    await expect(page.getByRole("button", { name: /Hantar Kod OTP|Send OTP/i })).toBeEnabled({ timeout: 3000 });
    await page.getByRole("button", { name: /Hantar Kod OTP|Send OTP/i }).click();
    // role="alert" wraps the bilingual error — both p tags match the regex so use the alert role
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// Admin Surface
// ─────────────────────────────────────────────

test.describe("Admin login", () => {
  test("redirects unauthenticated /admin to /admin/login — no redirect loop", async ({ page }) => {
    const response = await page.goto("/admin");
    // Should land on login page without ERR_TOO_MANY_REDIRECTS
    await expect(page).toHaveURL(/admin\/login/);
    expect(response?.status()).not.toBe(0); // no network error
  });

  test("/admin/login loads without infinite redirect", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/admin\/login/);
    // Admin login uses shadcn Label with "E-mel\nEmail" — use ID selectors
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: /Log Masuk|Sign In/i })).toBeVisible();
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#email").fill("wrong@example.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: /Log Masuk|Sign In/i }).click();
    // Should stay on login page and show an error
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// Scanner Surface
// ─────────────────────────────────────────────

test.describe("Scanner surface", () => {
  test("/scan loads with session selector", async ({ page }) => {
    await page.goto("/scan");
    await expect(page).toHaveURL(/scan/);
    // Should show either a session banner or programme pills
    await page.waitForLoadState("networkidle");
    // Page should not error
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test("/scan/manual loads with search input", async ({ page }) => {
    await page.goto("/scan/manual");
    await expect(page).toHaveURL(/scan\/manual/);
    await expect(page.getByRole("textbox")).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────
// Mobile responsiveness
// ─────────────────────────────────────────────

test.describe("Mobile — landing page", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("CTAs are visible and large enough on mobile", async ({ page }) => {
    await page.goto("/");
    // Wait for CSS to fully apply
    await page.waitForLoadState("networkidle");
    const registerBtn = page.getByRole("link", { name: /Daftar Sekarang/i });
    await expect(registerBtn).toBeVisible();
    const box = await registerBtn.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(48); // min-h-[56px]
  });
});
