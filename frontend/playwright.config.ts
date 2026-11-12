import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  testIgnore: /pairing\.spec\.ts/,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5173 --mode mock",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    env: {
      ...process.env,
      VITE_USE_MOCK: "1",
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Prefer an installed Chrome when Playwright's bundled Chromium download is blocked.
        channel: "chrome",
      },
    },
  ],
})
