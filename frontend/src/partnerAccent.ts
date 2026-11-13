/** Stable partner accent derived from membership order of user ids. */
export type PartnerAccent = "partner-a" | "partner-b"

export function partnerAccent(userId: string, memberIds: string[]): PartnerAccent {
  const ordered = [...memberIds].sort()
  const index = ordered.indexOf(userId)
  if (index <= 0) return "partner-a"
  return index % 2 === 0 ? "partner-a" : "partner-b"
}
