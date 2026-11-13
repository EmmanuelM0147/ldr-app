import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"
import type { AppNotification } from "../types"
import { NotificationsPanel } from "./NotificationsPanel"

const sample: AppNotification[] = [
  {
    id: "1",
    couple_id: "c1",
    recipient_user_id: "u1",
    kind: "check_in",
    title: "Check-in",
    body: "Bello checked in (good).",
    created_at: "2026-11-13T12:00:00.000Z",
    read_at: null,
  },
  {
    id: "2",
    couple_id: "c1",
    recipient_user_id: "u1",
    kind: "visit_created",
    title: "New visit",
    body: "Bello added 'Lagos trip'.",
    created_at: "2026-11-12T12:00:00.000Z",
    read_at: "2026-11-12T13:00:00.000Z",
  },
]

describe("NotificationsPanel", () => {
  it("filters unread and marks all as read", async () => {
    const user = userEvent.setup()
    const onMarkAllRead = vi.fn().mockResolvedValue(undefined)
    const onMarkRead = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <NotificationsPanel
          notifications={sample}
          unreadCount={1}
          timeZone="UTC"
          busy={false}
          error={null}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole("heading", { name: "Notifications" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeInTheDocument()
    await user.click(screen.getByRole("tab", { name: /Unread/ }))
    expect(screen.getByText("Bello checked in (good).")).toBeInTheDocument()
    expect(screen.queryByText("Bello added 'Lagos trip'.")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Mark all as read" }))
    expect(onMarkAllRead).toHaveBeenCalled()
  })
})
