import { defineConfig, devices } from "@playwright/test"

/**
 * Pairing e2e against docker compose (api + frontend + postgres).
 * Start the stack first: `docker compose up -d --build`
 * Then: `npm run test:e2e:compose`
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /pairing\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
      },
    },
  ],
})
