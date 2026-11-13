import { expect, test } from "@playwright/test"

test("visit flow creates a visit card with traveler and From/To route", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("ada@example.com")
  await page.getByLabel("Password", { exact: true }).fill("password123")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Visits" }).click()
  await expect(page.getByRole("heading", { name: "Visits" })).toBeVisible()

  await page.getByRole("button", { name: "Add visit" }).click()
  const dialog = page.getByRole("dialog", { name: "Add visit" })
  await expect(dialog).toBeVisible()

  const start = "2099-06-01T10:00"
  const end = "2099-06-08T18:00"
  await dialog.getByLabel("Title").fill("Abuja weekend")
  await dialog.locator('input[name="starts_at"]').fill(start)
  await dialog.locator('input[name="ends_at"]').fill(end)
  await dialog.getByLabel("From", { exact: true }).fill("Lagos")
  await dialog.getByLabel("To", { exact: true }).fill("Abuja")
  await dialog.getByLabel("Traveler").selectOption({ label: "Ada" })
  await dialog.getByRole("button", { name: "Add visit" }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByRole("heading", { name: "Abuja weekend" })).toBeVisible()
  await expect(page.getByText(/Route · Lagos → Abuja/)).toBeVisible()
  await expect(page.getByText("Traveler: Ada")).toBeVisible()
})
