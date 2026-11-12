/** Shapes mirrored from docs/openapi.yaml. The generated client replaces this later. */

export type Mood = "great" | "good" | "okay" | "low" | "rough"

export type User = {
  id: string
  email: string
  display_name: string
  timezone: string
  created_at: string
}

export type AuthResponse = {
  access_token: string
  token_type: "bearer"
  expires_in: 3600
  user: User
}

export type Member = {
  user_id: string
  display_name: string
  timezone: string
  joined_at: string
}

export type Couple = {
  id: string
  ai_opt_in: boolean
  created_at: string
  members: Member[]
}

export type InviteCreated = {
  code: string
  expires_at: string
}

export type EventItem = {
  id: string
  couple_id: string
  created_by: string
  title: string
  starts_at: string
  ends_at: string | null
  location: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type EventWrite = {
  title: string
  starts_at: string
  ends_at?: string | null
  location?: string | null
  notes?: string | null
}

export type BudgetShare = {
  user_id: string
  amount_minor: number
}

export type Budget = {
  currency: string
  total_minor: number
  shares: [BudgetShare, BudgetShare]
}

export type Visit = {
  id: string
  couple_id: string
  created_by: string
  title: string
  starts_at: string
  ends_at: string
  location: string | null
  notes: string | null
  budget: Budget | null
  created_at: string
  updated_at: string
}

export type VisitWrite = {
  title: string
  starts_at: string
  ends_at: string
  location?: string | null
  notes?: string | null
}

export type Countdown = {
  visit: Visit | null
  seconds_until: number | null
}

export type CheckIn = {
  id: string
  couple_id: string
  user_id: string
  local_date: string
  mood: Mood
  note: string | null
  created_at: string
  updated_at: string
}

export type CheckInWrite = {
  mood: Mood
  note?: string | null
}

export type Memory = {
  id: string
  couple_id: string
  author_id: string
  title: string | null
  body: string
  created_at: string
  updated_at: string
}

export type MemoryWrite = {
  title?: string | null
  body: string
}

export type RegisterRequest = {
  email: string
  password: string
  display_name: string
  timezone?: string
}
