import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // tests/e2e is Playwright's (see playwright.config.ts testDir). Vitest would
    // otherwise collect those specs and fail on `@playwright/test` imports.
    exclude: [...configDefaults.exclude, "tests/e2e/**"],
    // Suites that re-import a route's module graph under vi.resetModules() take
    // ~3s on their own and overrun the 5s default once the full suite runs in
    // parallel. 15s keeps them stable without hiding a genuine hang.
    testTimeout: 15_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
