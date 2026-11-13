import { defineConfig, devices } from "@playwright/test"

/** Capture real PNGs against a running local stack (Vite :5173 + API :8000). */
export default defineConfig({
  testDir: "./e2e",
  testMatch: /capture-screenshots\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173",
    trace: "off",
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
