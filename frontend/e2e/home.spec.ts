import { expect, test } from "@playwright/test"

test("home shows countdown hero and partner cards after sign-in", async ({ page }) => {
  await page.goto("/login")
  await page.getByLabel("Email").fill("ada@example.com")
  await page.getByLabel("Password", { exact: true }).fill("password123")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible()
  await expect(page.getByLabel("Next visit")).toBeVisible()
  await expect(page.getByText(/until you are together|No visit planned yet/i)).toBeVisible()
  await expect(page.getByLabel("You and your partner")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Ada" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Bello" })).toBeVisible()
  await expect(page.getByLabel("This week")).toBeVisible()
})
