import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createMockClient } from "../api/mockClient"
import type { CheckIn, Countdown, Memory } from "../types"
import { MemoryTimeline } from "./MemoryTimeline"
import { BudgetForm, CheckInForm, CountdownCard, EventForm, LoginForm, RegisterForm } from "./widgets"

describe("forms", () => {
  it("blocks a short password", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RegisterForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText("Display name"), "Ada")
    await user.type(screen.getByLabelText("Email"), "ada@example.com")
    await user.type(screen.getByLabelText("Password"), "short")
    await user.click(screen.getByRole("button", { name: "Create account" }))
    expect(screen.getByText("Password must be at least 8 characters.")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("signs in through the mock client", async () => {
    const user = userEvent.setup()
    const client = createMockClient()
    await client.register({
      email: "ada@example.com",
      password: "password123",
      display_name: "Ada",
      timezone: "UTC",
    })
    client.useToken(null)
    const onSubmit = vi.fn(async (email: string, password: string) => {
      await client.login(email, password)
    })
    render(<LoginForm onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText("Email"), "ada@example.com")
    await user.type(screen.getByLabelText("Password"), "password123")
    await user.click(screen.getByRole("button", { name: "Sign in" }))
    expect(onSubmit).toHaveBeenCalledWith("ada@example.com", "password123")
  })

  it("rejects an event that ends before it starts", async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<EventForm onCreate={onCreate} />)
    await user.type(screen.getByLabelText("Title"), "Flight")
    const dates = screen.getAllByLabelText("Date")
    const times = screen.getAllByLabelText("Time")
    await user.clear(dates[0])
    await user.type(dates[0], "2026-12-02")
    await user.clear(times[0])
    await user.type(times[0], "10:00")
    await user.clear(dates[1])
    await user.type(dates[1], "2026-12-01")
    await user.clear(times[1])
    await user.type(times[1], "10:00")
    await user.click(screen.getByRole("button", { name: "Add event" }))
    expect(screen.getByText("End must be after the start.")).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it("rejects a budget that does not add up", async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<BudgetForm memberIds={["one", "two"]} onSave={onSave} />)
    await user.type(screen.getByLabelText("Total"), "100")
    await user.type(screen.getByLabelText("Your share"), "40")
    await user.type(screen.getByLabelText("Their share"), "50")
    await user.click(screen.getByRole("button", { name: "Save split" }))
    expect(screen.getByText("The two shares must add up to the total.")).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it("shows an empty countdown", () => {
    const countdown: Countdown = { visit: null, seconds_until: null }
    render(<CountdownCard countdown={countdown} timeZone="UTC" />)
    expect(screen.getByRole("heading", { name: "No visit planned" })).toBeInTheDocument()
  })

  it("updates today's check-in and blocks a long note", async () => {
    const user = userEvent.setup()
    const existing: CheckIn = {
      id: "check-1",
      couple_id: "couple-1",
      user_id: "ada",
      local_date: "2026-11-12",
      mood: "good",
      note: "Quiet morning",
      created_at: "2026-11-12T08:00:00.000Z",
      updated_at: "2026-11-12T08:00:00.000Z",
    }
    const onSave = vi.fn()
    const { rerender } = render(<CheckInForm existing={existing} onSave={onSave} />)
    await user.click(screen.getByRole("button", { name: "Update today's check-in" }))
    expect(onSave).toHaveBeenCalledOnce()

    onSave.mockClear()
    rerender(<CheckInForm existing={null} onSave={onSave} />)
    await user.click(screen.getByLabelText("Note"))
    await user.paste("a".repeat(281))
    await user.click(screen.getByRole("button", { name: "Save today's check-in" }))
    expect(screen.getByText("Notes can be at most 280 characters.")).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  }, 10_000)

  it("hides delete on a partner's memory", () => {
    const memories: Memory[] = [
      memory("mine", "ada", "My note"),
      memory("theirs", "bello", "Their note"),
    ]
    render(
      <MemoryTimeline
        memories={memories}
        currentUserId="ada"
        memberIds={["ada", "bello"]}
        timeZone="UTC"
        onDelete={vi.fn()}
      />,
    )
    expect(screen.getAllByRole("button", { name: "Delete memory" })).toHaveLength(1)
  })
})

function memory(id: string, authorId: string, body: string): Memory {
  return {
    id,
    couple_id: "couple-1",
    author_id: authorId,
    title: null,
    body,
    media: null,
    created_at: "2026-11-12T08:00:00.000Z",
    updated_at: "2026-11-12T08:00:00.000Z",
  }
}
