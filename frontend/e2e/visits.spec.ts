import { expect, test } from "@playwright/test"

test("visit flow creates a visit card with traveler and route", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("ada@example.com")
  await page.getByLabel("Password").fill("password123")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("link", { name: "Visits" }).click()
  await expect(page.getByRole("heading", { name: "Visits" })).toBeVisible()

  const start = "2099-06-01T10:00"
  const end = "2099-06-08T18:00"
  await page.getByLabel("Title").fill("Abuja weekend")
  await page.locator('input[name="starts_at"]').fill(start)
  await page.locator('input[name="ends_at"]').fill(end)
  await page.getByLabel("Route / city").fill("Abuja")
  await page.getByLabel("Traveler").selectOption({ label: "Ada" })
  await page.getByRole("button", { name: "Add visit" }).click()

  await expect(page.getByRole("heading", { name: "Abuja weekend" })).toBeVisible()
  await expect(page.getByText(/Route · Abuja/)).toBeVisible()
  await expect(page.getByText("Traveler: Ada")).toBeVisible()
})
