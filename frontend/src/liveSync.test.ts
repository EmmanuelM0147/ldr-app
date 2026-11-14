import { describe, expect, it } from "vitest"
import type { AppNotification, Couple } from "./types"
import { mergeNotifications, newestUnreadPartnerJoined, partnerJoinedMessage } from "./liveSync"

const coupleOne: Couple = {
  id: "c1",
  ai_enabled: false,
  created_at: "2026-11-01T00:00:00.000Z",
  members: [
    {
      user_id: "ada",
      display_name: "Ada",
      timezone: "UTC",
      joined_at: "2026-11-01T00:00:00.000Z",
      avatar_url: null,
    },
  ],
}

const coupleTwo: Couple = {
  ...coupleOne,
  members: [
    ...coupleOne.members,
    {
      user_id: "bello",
      display_name: "Bello",
      timezone: "UTC",
      joined_at: "2026-11-02T00:00:00.000Z",
      avatar_url: null,
    },
  ],
}

describe("liveSync", () => {
  it("merges notifications by id and keeps newest first", () => {
    const older: AppNotification = {
      id: "1",
      couple_id: "c1",
      recipient_user_id: "ada",
      kind: "check_in",
      title: "Check-in",
      body: "old",
      created_at: "2026-11-01T00:00:00.000Z",
      read_at: null,
    }
    const newer: AppNotification = {
      ...older,
      id: "2",
      created_at: "2026-11-02T00:00:00.000Z",
      body: "new",
    }
    const updatedOlder = { ...older, read_at: "2026-11-02T01:00:00.000Z" }
    expect(mergeNotifications([older], [newer, updatedOlder]).map((item) => item.id)).toEqual(["2", "1"])
    expect(mergeNotifications([older], [updatedOlder])[0]?.read_at).toBe("2026-11-02T01:00:00.000Z")
  })

  it("detects partner join from couple growth", () => {
    expect(partnerJoinedMessage(coupleOne, coupleTwo, "ada")).toBe("Bello joined your space.")
    expect(partnerJoinedMessage(coupleTwo, coupleTwo, "ada")).toBeNull()
  })

  it("finds a new unread partner_joined notification", () => {
    const existing: AppNotification[] = []
    const incoming: AppNotification[] = [
      {
        id: "n1",
        couple_id: "c1",
        recipient_user_id: "ada",
        kind: "partner_joined",
        title: "Partner joined",
        body: "Bello joined your space.",
        created_at: "2026-11-02T00:00:00.000Z",
        read_at: null,
      },
    ]
    expect(newestUnreadPartnerJoined(existing, incoming)?.id).toBe("n1")
    expect(newestUnreadPartnerJoined(incoming, incoming)).toBeNull()
  })
})
