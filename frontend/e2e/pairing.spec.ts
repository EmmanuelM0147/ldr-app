import { expect, test, type Page } from "@playwright/test"

async function register(page: Page, input: { email: string; name: string; password: string }) {
  await page.goto("/register")
  await page.getByLabel("Display name").fill(input.name)
  await page.getByLabel("Email").fill(input.email)
  await page.getByLabel("Password", { exact: true }).fill(input.password)
  // Detected IANA zone is preselected on the searchable timezone control.
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByRole("heading", { name: /Start your couple space/i })).toBeVisible()
}

test("register two users, pair via invite code, both see the same space", async ({ browser }) => {
  const stamp = Date.now()
  const password = "password123"
  const ada = { email: `ada-${stamp}@example.com`, name: "Ada", password }
  const bello = { email: `bello-${stamp}@example.com`, name: "Bello", password }

  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await register(pageA, ada)
  await pageA.getByRole("button", { name: "Create a space" }).click()
  await expect(pageA.getByRole("heading", { name: "Invite your partner" })).toBeVisible()
  const inviteCode = (await pageA.locator(".code").innerText()).trim()
  expect(inviteCode.length).toBeGreaterThanOrEqual(8)

  await register(pageB, bello)
  await pageB.getByRole("textbox", { name: "Invite code" }).fill(inviteCode)
  await pageB.getByRole("button", { name: "Join with invite code" }).click()
  await expect(pageB.getByLabel("You and your partner")).toBeVisible()
  await expect(pageB.getByRole("heading", { name: "Ada" })).toBeVisible()
  await expect(pageB.getByRole("heading", { name: "Bello" })).toBeVisible()

  await pageA.reload()
  await expect(pageA.getByLabel("You and your partner")).toBeVisible()
  await expect(pageA.getByRole("heading", { name: "Ada" })).toBeVisible()
  await expect(pageA.getByRole("heading", { name: "Bello" })).toBeVisible()

  await contextA.close()
  await contextB.close()
})
