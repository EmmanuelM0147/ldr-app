import { render, screen } from "@testing-library/react"
import type { Memory } from "../types"
import { MemoryTimeline, OnThisDay, onThisDay } from "./MemoryTimeline"

function memory(id: string, created_at: string, body: string): Memory {
  return {
    id,
    couple_id: "c1",
    author_id: "ada",
    title: null,
    body,
    media: null,
    created_at,
    updated_at: created_at,
  }
}

describe("MemoryTimeline", () => {
  it("filters on-this-day memories by month and day", () => {
    const items = [
      memory("1", "2025-11-12T10:00:00.000Z", "Last year"),
      memory("2", "2026-11-11T10:00:00.000Z", "Yesterday"),
      memory("3", "2026-11-12T09:00:00.000Z", "Today"),
    ]
    expect(onThisDay(items, new Date("2026-11-12T12:00:00.000Z")).map((item) => item.id)).toEqual(["3", "1"])
  })

  it("renders timeline and on-this-day sections", () => {
    const items = [memory("1", "2026-11-12T10:00:00.000Z", "Kitchen light")]
    render(
      <>
        <OnThisDay memories={onThisDay(items, new Date("2026-11-12T12:00:00.000Z"))} timeZone="UTC" />
        <MemoryTimeline
          memories={items}
          currentUserId="ada"
          memberIds={["ada", "bello"]}
          timeZone="UTC"
          onDelete={() => undefined}
        />
      </>,
    )
    expect(screen.getByRole("heading", { name: "On this day" })).toBeInTheDocument()
    expect(screen.getByLabelText("Memory timeline")).toBeInTheDocument()
    expect(screen.getAllByText("Kitchen light")).toHaveLength(2)
  })
})
