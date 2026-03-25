/**
 * Visual audit — screenshots every page of the app.
 * Run: npx playwright test tests/e2e/audit-screenshots.spec.ts --workers=1
 * Screenshots land in: test-results/audit/
 */
import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const OUT = path.join(process.cwd(), "test-results", "audit");
fs.mkdirSync(OUT, { recursive: true });

const ADMIN_EMAIL    = "admin@santunanemas.sg";
const ADMIN_PASSWORD = "Admin@2026!";

async function shot(page: any, name: string) {
  await page.screenshot({
    path: path.join(OUT, `${name}.png`),
    fullPage: true,
  });
  console.log(`  screenshot: ${name}.png`);
}

// ── PUBLIC PAGES ──────────────────────────────────────────────────────────────

test("01 Landing page /", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await shot(page, "01_landing");
});

test("02 Register /register", async ({ page }) => {
  await page.goto("/register");
  await page.waitForLoadState("networkidle");
  await shot(page, "02_register");
});

test("03 Register success /register/success", async ({ page }) => {
  await page.goto("/register/success?name=Siti+Binte+Mohd+Noor");
  await page.waitForLoadState("networkidle");
  await shot(page, "03_register_success");
});

test("04 Retrieve QR /retrieve-qr", async ({ page }) => {
  await page.goto("/retrieve-qr");
  await page.waitForLoadState("networkidle");
  await shot(page, "04_retrieve_qr");
});

// ── SCANNER PAGES ─────────────────────────────────────────────────────────────

test("05 QR Scanner /scan", async ({ page }) => {
  await page.goto("/scan");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500); // camera permission prompt settles
  await shot(page, "05_scan");
});

test("06 Manual lookup /scan/manual", async ({ page }) => {
  await page.goto("/scan/manual");
  await page.waitForLoadState("networkidle");
  await shot(page, "06_scan_manual");
});

// ── ADMIN PAGES ───────────────────────────────────────────────────────────────

test("07 Admin login /admin/login", async ({ page }) => {
  await page.goto("/admin/login");
  await page.waitForLoadState("networkidle");
  await shot(page, "07_admin_login");
});

// Shared login helper — runs before each admin test
async function loginAsAdmin(page: any) {
  await page.goto("/admin/login");
  await page.locator("#email").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Log Masuk/i }).click();
  await expect(page).not.toHaveURL(/admin\/login/, { timeout: 15000 });
  await page.waitForLoadState("networkidle");
}

test("08 Admin dashboard /admin", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin");
  await page.waitForLoadState("networkidle");
  await shot(page, "08_admin_dashboard");
});

test("09 Admin sessions /admin/sessions", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/sessions");
  await page.waitForLoadState("networkidle");
  await shot(page, "09_admin_sessions");
});

test("09b Admin session detail", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/sessions");
  await page.waitForLoadState("networkidle");
  // Click the first View/eye link
  const link = page.locator("table tbody tr:first-child a").first();
  if (await link.count() > 0) {
    await link.click();
    await page.waitForLoadState("networkidle");
    await shot(page, "09b_admin_session_detail");
  } else {
    console.log("  no session detail link found — skipping");
  }
});

test("10 Admin participants /admin/participants", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/participants");
  await page.waitForLoadState("networkidle");
  await shot(page, "10_admin_participants");
});

test("10b Admin participant detail", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/participants");
  await page.waitForLoadState("networkidle");
  const link = page.locator("table tbody tr:first-child a").first();
  if (await link.count() > 0) {
    await link.click();
    await page.waitForLoadState("networkidle");
    await shot(page, "10b_admin_participant_detail");
  }
});

test("11 Admin attendance /admin/attendance", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/attendance");
  await page.waitForLoadState("networkidle");
  await shot(page, "11_admin_attendance");
});

test("12 Admin programmes /admin/programmes", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/programmes");
  await page.waitForLoadState("networkidle");
  await shot(page, "12_admin_programmes");
});

test("13 Admin settings /admin/settings", async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto("/admin/settings");
  await page.waitForLoadState("networkidle");
  await shot(page, "13_admin_settings");
});
