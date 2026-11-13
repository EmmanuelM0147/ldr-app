import { defineConfig, devices } from "@playwright/test"

/**
 * Pairing e2e against the Compose stack (Postgres + API + frontend).
 *
 * Preferred:
 *   docker compose up -d --build
 *   npm run test:e2e:compose
 *
 * If Docker Hub is unreachable and images are stale, keep Compose `db` (+ optional
 * `frontend`) and run the current API on the host against that Postgres:
 *   docker compose up -d db frontend
 *   DATABASE_URL=postgresql+psycopg://closer:closer@localhost:5433/closer \
 *     JWT_SECRET=<strong-random-min-32-chars> CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173 \
 *     alembic upgrade head && uvicorn app.main:app --host 127.0.0.1 --port 8000
 *   npm run test:e2e:compose
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
