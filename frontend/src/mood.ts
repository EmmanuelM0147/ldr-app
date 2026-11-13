import type { Mood } from "./types"

export const MOOD_CHIPS: Array<{ mood: Mood; emoji: string; label: string }> = [
  { mood: "great", emoji: "🌟", label: "Great" },
  { mood: "good", emoji: "🙂", label: "Good" },
  { mood: "okay", emoji: "😑", label: "Okay" },
  { mood: "low", emoji: "😔", label: "Low" },
  { mood: "rough", emoji: "🌧️", label: "Rough" },
]

export function moodLabel(mood: Mood): string {
  const chip = MOOD_CHIPS.find((item) => item.mood === mood)
  return chip ? `${chip.emoji} ${chip.label}` : mood
}

/** Consecutive local-date check-ins ending on `today` for one user. */
export function checkInStreak(dates: string[], today: string): number {
  const set = new Set(dates)
  if (!set.has(today)) return 0
  let streak = 0
  let cursor = today
  while (set.has(cursor)) {
    streak += 1
    const previous = new Date(`${cursor}T12:00:00Z`)
    previous.setUTCDate(previous.getUTCDate() - 1)
    cursor = previous.toISOString().slice(0, 10)
  }
  return streak
}

export const DAILY_PROMPT = "What felt closest between you today?"
