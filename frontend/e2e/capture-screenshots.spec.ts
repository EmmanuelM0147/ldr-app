import { expect, test } from "@playwright/test"
import path from "node:path"
import { fileURLToPath } from "node:url"

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/screenshots")
const EMAIL = "ada.live@example.com"
const PASSWORD = "password123"

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
})

test("capture portfolio screenshots", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
  await page.screenshot({ path: path.join(OUT, "login.png"), fullPage: false })

  await page.getByLabel("Email").fill(EMAIL)
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: /Sign in|Log in/i }).click()

  await expect(page.getByLabel("You and your partner")).toBeVisible({ timeout: 20_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(OUT, "home.png"), fullPage: false })

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Calendar" }).click()
  await expect(page.getByRole("heading", { name: /Calendar/i })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, "calendar.png"), fullPage: false })

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Visits" }).click()
  await expect(page.getByRole("heading", { name: "Visits" })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, "visits.png"), fullPage: false })

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Check-in" }).click()
  await expect(page.getByRole("heading", { name: "Check-in", exact: true })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, "check-in.png"), fullPage: false })

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Memories" }).click()
  await expect(page.getByRole("heading", { name: /Memories/i })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, "memories.png"), fullPage: false })

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Settings" }).click()
  await expect(page.getByRole("heading", { name: /Settings/i })).toBeVisible()
  await page.waitForTimeout(500)
  await page.screenshot({ path: path.join(OUT, "settings.png"), fullPage: false })
})
