import { expect, test, type Page } from "@playwright/test"

async function register(page: Page, input: { email: string; name: string; password: string }) {
  await page.goto("/register")
  await page.getByLabel("Display name").fill(input.name)
  await page.getByLabel("Email").fill(input.email)
  await page.getByLabel("Password", { exact: true }).fill(input.password)
  await page.getByLabel("Timezone").fill("UTC")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByRole("heading", { name: /Start with just the two of you/i })).toBeVisible()
}

test("user A creates a space, user B joins, both see the same visit and check-in", async ({ browser }) => {
  const stamp = Date.now()
  const password = "password123"
  const ada = { email: `ada-${stamp}@example.com`, name: "Ada", password }
  const bello = { email: `bello-${stamp}@example.com`, name: "Bello", password }
  const visitTitle = `Lagos reunion ${stamp}`

  const contextA = await browser.newContext()
  const contextB = await browser.newContext()
  const pageA = await contextA.newPage()
  const pageB = await contextB.newPage()

  await register(pageA, ada)
  await pageA.getByRole("button", { name: "Create our space" }).click()
  await expect(pageA.getByRole("heading", { name: "Invite your partner" })).toBeVisible()
  const inviteCode = (await pageA.locator(".code").innerText()).trim()
  expect(inviteCode.length).toBeGreaterThanOrEqual(8)

  await register(pageB, bello)
  await pageB.getByLabel("Invite code").fill(inviteCode)
  await pageB.getByRole("button", { name: "Join with a code" }).click()
  await expect(pageB.getByLabel("You and your partner")).toBeVisible()
  await expect(pageB.getByRole("heading", { name: "Ada" })).toBeVisible()
  await expect(pageB.getByRole("heading", { name: "Bello" })).toBeVisible()

  await pageA.reload()
  await expect(pageA.getByLabel("You and your partner")).toBeVisible()

  await pageA.getByRole("link", { name: "Visits" }).click()
  await expect(pageA.getByRole("heading", { name: "Visits" })).toBeVisible()
  await pageA.getByLabel("Title").fill(visitTitle)
  await pageA.getByLabel("Arrives").fill("2099-07-01T10:00")
  await pageA.getByLabel("Leaves").fill("2099-07-05T18:00")
  await pageA.getByLabel("Route / city").fill("Lagos")
  await pageA.getByLabel("Traveler").selectOption({ label: "Ada" })
  await pageA.getByRole("button", { name: "Add visit" }).click()
  await expect(pageA.getByRole("alert")).toHaveCount(0)
  const visitCardA = pageA.getByRole("article").filter({ hasText: visitTitle })
  await expect(visitCardA.getByRole("heading", { name: visitTitle })).toBeVisible({ timeout: 15_000 })

  await pageA.getByRole("link", { name: "Check-in" }).click()
  await expect(pageA.getByRole("heading", { name: "Check-in", exact: true })).toBeVisible()
  await pageA.getByRole("radio", { name: /Great/i }).click()
  await pageA.getByLabel("Note").fill("Counting the days together.")
  await pageA.getByRole("button", { name: /Save today's check-in|Update today's check-in/i }).click()
  await expect(pageA.getByLabel("Both check-ins today").getByText("Counting the days together.")).toBeVisible({
    timeout: 15_000,
  })

  await pageB.getByRole("link", { name: "Visits" }).click()
  const visitCardB = pageB.getByRole("article").filter({ hasText: visitTitle })
  await expect(visitCardB.getByRole("heading", { name: visitTitle })).toBeVisible({ timeout: 15_000 })
  await expect(visitCardB.getByText(/Route · Lagos/)).toBeVisible()

  await pageB.getByRole("link", { name: "Check-in" }).click()
  const both = pageB.getByLabel("Both check-ins today")
  await expect(both.getByText("Counting the days together.")).toBeVisible({ timeout: 15_000 })
  await expect(both.getByText(/Great/i)).toBeVisible()

  await contextA.close()
  await contextB.close()
})
