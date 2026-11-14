import type { AppNotification, Couple } from "./types"

/** Poll interval while the tab is visible (WebSocket may be unavailable on serverless). */
export const LIVE_POLL_MS = 20_000

export function mergeNotifications(
  current: AppNotification[],
  incoming: AppNotification[],
): AppNotification[] {
  const byId = new Map<string, AppNotification>()
  for (const item of current) byId.set(item.id, item)
  for (const item of incoming) byId.set(item.id, item)
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

/** When membership grows to two people, return a short notice for the waiting partner. */
export function partnerJoinedMessage(
  previous: Couple | null,
  next: Couple,
  viewerId: string | undefined,
): string | null {
  if (!viewerId) return null
  if ((previous?.members.length ?? 0) >= 2) return null
  if (next.members.length < 2) return null
  const joiner = next.members.find((member) => member.user_id !== viewerId)
  return joiner ? `${joiner.display_name} joined your space.` : "Your partner joined your space."
}

export function newestUnreadPartnerJoined(
  previous: AppNotification[],
  next: AppNotification[],
): AppNotification | null {
  const known = new Set(previous.map((item) => item.id))
  return (
    next.find(
      (item) => item.kind === "partner_joined" && item.read_at === null && !known.has(item.id),
    ) ?? null
  )
}
