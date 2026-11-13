import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"
import { NotificationsBell } from "./NotificationsBell"

describe("NotificationsBell", () => {
  it("links to notifications with an unread count in the accessible name", () => {
    render(
      <MemoryRouter>
        <NotificationsBell unreadCount={3} />
      </MemoryRouter>,
    )
    const link = screen.getByRole("link", { name: "Notifications, 3 unread" })
    expect(link).toHaveAttribute("href", "/notifications")
    expect(link.querySelector(".notifications-badge")).toHaveTextContent("3")
  })

  it("has a plain Notifications label when everything is read", () => {
    render(
      <MemoryRouter>
        <NotificationsBell unreadCount={0} />
      </MemoryRouter>,
    )
    expect(screen.getByRole("link", { name: "Notifications" })).toBeInTheDocument()
    expect(document.querySelector(".notifications-badge")).toBeNull()
  })
})
