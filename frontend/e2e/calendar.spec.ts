import { expect, test } from "@playwright/test"

test("calendar FAB adds an event that appears on the selected day", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("ada@example.com")
  await page.getByLabel("Password", { exact: true }).fill("password123")
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Calendar" }).click()
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible()

  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = "15"
  const startsDate = `${year}-${month}-${day}`

  await page.getByRole("button", { name: "Add event" }).click()
  const dialog = page.getByRole("dialog", { name: "Add event" })
  await expect(dialog).toBeVisible()

  await dialog.getByLabel("Title").fill("Airport pickup")
  await dialog.locator('input[name="starts_date"]').fill(startsDate)
  await dialog.locator('input[name="starts_time"]').fill("14:30")
  await dialog.getByLabel("Place").fill("Murtala Muhammed")
  await dialog.getByRole("button", { name: "Add event" }).click()

  await expect(dialog).toBeHidden()
  await page.getByRole("gridcell", { name: "15" }).click()
  const dayPanel = page.getByLabel(/Events on/)
  await expect(dayPanel.getByText("Airport pickup")).toBeVisible()
  await expect(dayPanel.getByText(/Murtala Muhammed/)).toBeVisible()
})
