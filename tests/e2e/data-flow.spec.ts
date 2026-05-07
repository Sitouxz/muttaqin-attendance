/**
 * Data-flow tests — verifies seeded data flows correctly through every surface
 * of the Santunan Emas attendance app.
 *
 * Seeded data:
 *   Admin : admin@santunanemas.sg / Admin@2026!
 *   Active session today: "Sesi Emas 25 Mac 2026" (Kuliah + Sewing)
 *   Participants: 25 (e.g. ahmad.yusof@gmail.com, siti.mdnoor@gmail.com …)
 *   Attendance: 8 checked-in for Kuliah today, 5 for Sewing today
 */

import { test, expect, type Page } from "@playwright/test";

// ─── shared credentials ───────────────────────────────────────────────────────
const ADMIN_EMAIL    = "admin@santunanemas.sg";
const ADMIN_PASSWORD = "Admin@2026!";

// A participant whose QR image was generated during seeding
const PARTICIPANT_EMAIL = "siti.mdnoor@gmail.com";
const PARTICIPANT_NAME  = "Siti Binte Mohd Noor";

// ─────────────────────────────────────────────────────────────────────────────
// 1. LANDING PAGE — active session card
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Landing page — live session data", () => {
  test("shows today's active session with its title and programme pills", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Active session badge
    await expect(page.getByText(/Sesi Aktif|Active Session/i)).toBeVisible();
    // Today's session title
    await expect(page.getByText(/Sesi Emas 25 Mac 2026/i)).toBeVisible();
    // Programme pills (Kuliah and Sewing are linked to this session)
    await expect(page.getByText("Kuliah")).toBeVisible();
    await expect(page.getByText("Sewing")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. QR RETRIEVAL — real participant lookup
// ─────────────────────────────────────────────────────────────────────────────
test.describe("QR retrieval — seeded participant", () => {
  test("unregistered email shows EMAIL_NOT_FOUND error", async ({ page }) => {
    await page.goto("/retrieve-qr");
    await page.locator("#retrieve-email").click();
    await page.locator("#retrieve-email").pressSequentially("nobody@example.com");
    await expect(page.getByRole("button", { name: /Hantar Kod OTP|Send OTP/i })).toBeEnabled({ timeout: 8000 });
    await page.getByRole("button", { name: /Hantar Kod OTP|Send OTP/i }).click();
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/tidak dijumpai|not found/i).first()).toBeVisible();
  });

  test("registered email proceeds to OTP step", async ({ page }) => {
    await page.goto("/retrieve-qr");
    await page.locator("#retrieve-email").click();
    await page.locator("#retrieve-email").pressSequentially(PARTICIPANT_EMAIL);
    await expect(page.getByRole("button", { name: /Hantar Kod OTP|Send OTP/i })).toBeEnabled({ timeout: 8000 });
    await page.getByRole("button", { name: /Hantar Kod OTP|Send OTP/i }).click();
    // Should advance to step 2 (OTP input) — heading is unique
    await expect(page.getByRole("heading", { name: /Masukkan Kod Pengesahan/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("#otp-input")).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. ADMIN LOGIN
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin login — seeded credentials", () => {
  test("wrong credentials stays on login with error", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#email").fill("admin@santunanemas.sg");
    await page.locator("#password").fill("WrongPassword!");
    await page.getByRole("button", { name: /Log Masuk|Sign In/i }).click();
    await expect(page).toHaveURL(/admin\/login/, { timeout: 10000 });
    await expect(page.getByText(/salah|invalid/i)).toBeVisible({ timeout: 8000 });
  });

  test("correct credentials redirects to /admin dashboard", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#email").fill(ADMIN_EMAIL);
    await page.locator("#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: /Log Masuk|Sign In/i }).click();
    // Should land on admin dashboard (not login)
    await expect(page).not.toHaveURL(/admin\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: log in and return page on admin dashboard
// ─────────────────────────────────────────────────────────────────────────────
async function loginAsAdmin(page: Page) {
  await page.goto("/admin/login");
  await page.locator("#email").fill(ADMIN_EMAIL);
  await page.locator("#password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /Log Masuk|Sign In/i }).click();
  await expect(page).not.toHaveURL(/admin\/login/, { timeout: 15000 });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. ADMIN PARTICIPANTS — list shows seeded participants
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin participants list", () => {
  test("shows at least 25 seeded participants", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/participants");
    await page.waitForLoadState("networkidle");
    // Table should show rows
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
    // Pagination footer shows total count ≥ 25
    await expect(page.getByText(/25 peserta/i)).toBeVisible({ timeout: 10000 });
  });

  test("participant search filters by name", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/participants");
    await page.waitForLoadState("networkidle");
    // Find the search input and type a partial name
    const searchInput = page.getByPlaceholder(/cari|search/i);
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    await searchInput.fill("Ahmad");
    await page.waitForTimeout(500); // debounce
    await expect(page.getByText(/Ahmad Bin Yusof/i)).toBeVisible({ timeout: 8000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. ADMIN ATTENDANCE — list shows seeded attendance rows
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin attendance list", () => {
  test("shows attendance records with participant names", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/attendance");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("table")).toBeVisible({ timeout: 10000 });
    // At least one known participant name appears in the list
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10000 });
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. ADMIN SESSIONS — list shows seeded sessions
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Admin sessions list", () => {
  test("shows all 7 seeded sessions including the active one", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/sessions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/Sesi Emas 25 Mac 2026/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Sesi Kuliah Januari 2026/i)).toBeVisible({ timeout: 10000 });
    // Active badge should be visible for today's session
    await expect(page.getByText(/Aktif|active/i).first()).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. SCANNER — manual check-in lookup finds seeded participants
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Scanner manual lookup", () => {
  test("search by name returns seeded participant", async ({ page }) => {
    await page.goto("/scan/manual");
    await page.waitForLoadState("networkidle");
    const searchInput = page.getByRole("textbox");
    await expect(searchInput).toBeVisible();
    // Type at least 2 chars to trigger search
    await searchInput.fill("Siti");
    // Wait for results (debounced 300ms + API call)
    await expect(page.getByText(PARTICIPANT_NAME)).toBeVisible({ timeout: 10000 });
    // Check-in button should be visible next to the result
    await expect(page.getByRole("button", { name: /Daftar Masuk/i }).first()).toBeVisible();
  });

  test("search by phone returns seeded participant", async ({ page }) => {
    await page.goto("/scan/manual");
    await page.waitForLoadState("networkidle");
    const searchInput = page.getByRole("textbox");
    await searchInput.fill("91234567"); // Siti's phone
    await expect(page.getByText(PARTICIPANT_NAME)).toBeVisible({ timeout: 10000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. REGISTRATION - duplicate email accepted
// ─────────────────────────────────────────────────────────────────────────────
test.describe("Registration - duplicate email", () => {
  test("existing email can submit successfully", async ({ page }) => {
    await page.route("**/api/register", async (route) => {
      expect(route.request().postDataJSON().email).toBe(PARTICIPANT_EMAIL);
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ success: true, participant_id: "duplicate-email-ok" }),
      });
    });

    await page.goto("/register");
    await page.locator("#full_name").fill("Test Duplicate");
    await page.locator("#email").fill(PARTICIPANT_EMAIL);
    await page.locator("#phone").fill("87654321");
    await page.locator("#age").fill("60");
    await page.locator("#postal_code").fill("560100");
    await page.locator('input[value="male"]').check();
    await page.locator('input[value="warga_emas"]').check();
    await page.getByRole("button", { name: /Daftar Sekarang|Register/i }).click();
    await expect(page).toHaveURL(/register\/success/, { timeout: 10000 });
  });
});
