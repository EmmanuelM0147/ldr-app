import type {
  AuthResponse,
  Budget,
  CheckIn,
  CheckInWrite,
  Countdown,
  Couple,
  EventItem,
  EventWrite,
  InviteCreated,
  LiveEvent,
  Memory,
  MemoryWrite,
  Member,
  Presence,
  RegisterRequest,
  User,
  Visit,
  VisitWrite,
} from "../types"
import { localDate } from "../format"
import { ApiError } from "./errors"

type StoredUser = User & { password_mark: string }

type Invite = InviteCreated & {
  couple_id: string
  created_by: string
  used_at: string | null
}

export type Database = {
  users: StoredUser[]
  sessions: { token: string; user_id: string }[]
  couples: Couple[]
  invites: Invite[]
  events: EventItem[]
  visits: Visit[]
  checkIns: CheckIn[]
  memories: Memory[]
  presence: Presence[]
  inviteCreates: { user_id: string; at: string }[]
  joinFailures: string[]
}

type Store = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

type Options = {
  db?: Database
  now?: () => Date
  storage?: Store
  storageKey?: string
}

const HOUR_MS = 3_600_000
const WEEK_MS = 7 * 24 * HOUR_MS

export function emptyDatabase(): Database {
  return {
    users: [],
    sessions: [],
    couples: [],
    invites: [],
    events: [],
    visits: [],
    checkIns: [],
    memories: [],
    presence: [],
    inviteCreates: [],
    joinFailures: [],
  }
}

function newId(): string {
  return crypto.randomUUID()
}

function newCode(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")
}

function assertTimezone(zone: string): void {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: zone })
  } catch {
    throw new ApiError(422, "Timezone must be a valid IANA name.")
  }
}

function publicUser(user: StoredUser): User {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    timezone: user.timezone,
    created_at: user.created_at,
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

export function createMockClient(options: Options = {}) {
  const now = options.now ?? (() => new Date())
  const db = options.db ?? emptyDatabase()
  let token: string | null = null
  const listeners = new Set<(event: LiveEvent) => void>()

  const emit = (event: LiveEvent) => {
    for (const listener of listeners) listener(event)
  }

  const persist = () => {
    if (!options.storage || !options.storageKey) return
    options.storage.setItem(options.storageKey, JSON.stringify(db))
  }

  const currentUser = (): StoredUser => {
    const session = db.sessions.find((item) => item.token === token)
    const user = db.users.find((item) => item.id === session?.user_id)
    if (!session || !user) throw new ApiError(401, "Sign in again.")
    return user
  }

  const coupleFor = (userId: string): Couple | undefined =>
    db.couples.find((couple) => couple.members.some((member) => member.user_id === userId))

  const requireCouple = (): Couple => {
    const couple = coupleFor(currentUser().id)
    if (!couple) throw new ApiError(404, "You do not have a couple space.")
    return couple
  }

  const auth = (user: StoredUser): AuthResponse => {
    const access = `mock.${user.id}.${newId()}`
    db.sessions.push({ token: access, user_id: user.id })
    token = access
    persist()
    return {
      access_token: access,
      token_type: "bearer",
      expires_in: 3600,
      user: publicUser(user),
    }
  }

  return {
    useToken(next: string | null) {
      token = next
    },
    database: db,

    async register(input: RegisterRequest): Promise<AuthResponse> {
      const email = input.email.trim().toLowerCase()
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new ApiError(422, "Enter a valid email.")
      if (input.password.length < 8 || input.password.length > 72) {
        throw new ApiError(422, "Password must be 8 to 72 characters.")
      }
      const displayName = input.display_name.trim()
      if (displayName.length < 1 || displayName.length > 40) {
        throw new ApiError(422, "Display name must be 1 to 40 characters.")
      }
      const timezone = input.timezone?.trim() || "UTC"
      assertTimezone(timezone)
      if (db.users.some((user) => user.email === email)) {
        throw new ApiError(409, "An account with that email already exists.")
      }
      const user: StoredUser = {
        id: newId(),
        email,
        display_name: displayName,
        timezone,
        created_at: now().toISOString(),
        password_mark: `mock:${input.password}`,
      }
      db.users.push(user)
      return auth(user)
    },

    async login(email: string, password: string): Promise<AuthResponse> {
      const user = db.users.find((item) => item.email === email.trim().toLowerCase())
      if (!user || user.password_mark !== `mock:${password}`) {
        throw new ApiError(401, "Email or password is wrong.")
      }
      return auth(user)
    },

    async getMe(): Promise<User> {
      return publicUser(currentUser())
    },

    async createCouple(): Promise<Couple> {
      const user = currentUser()
      if (coupleFor(user.id)) throw new ApiError(409, "You already have a couple space.")
      const couple: Couple = {
        id: newId(),
        ai_opt_in: false,
        created_at: now().toISOString(),
        members: [memberFrom(user, now)],
      }
      db.couples.push(couple)
      db.presence.push({ user_id: user.id, free_to_talk: false, updated_at: now().toISOString() })
      persist()
      return clone(couple)
    },

    async getCurrentCouple(): Promise<Couple> {
      return clone(requireCouple())
    },

    async deleteCurrentCouple(): Promise<void> {
      const couple = requireCouple()
      const id = couple.id
      db.couples = db.couples.filter((item) => item.id !== id)
      db.invites = db.invites.filter((item) => item.couple_id !== id)
      db.events = db.events.filter((item) => item.couple_id !== id)
      db.visits = db.visits.filter((item) => item.couple_id !== id)
      db.checkIns = db.checkIns.filter((item) => item.couple_id !== id)
      db.memories = db.memories.filter((item) => item.couple_id !== id)
      db.presence = db.presence.filter((item) => !couple.members.some((member) => member.user_id === item.user_id))
      persist()
    },

    async createInvite(): Promise<InviteCreated> {
      const user = currentUser()
      const couple = requireCouple()
      if (couple.members.length >= 2) throw new ApiError(409, "This space already has two people.")
      const recent = db.inviteCreates.filter(
        (item) => item.user_id === user.id && now().getTime() - new Date(item.at).getTime() < HOUR_MS,
      )
      if (recent.length >= 5) throw new ApiError(429, "Too many invite codes. Try again later.")
      const invite: Invite = {
        code: newCode(),
        expires_at: new Date(now().getTime() + WEEK_MS).toISOString(),
        couple_id: couple.id,
        created_by: user.id,
        used_at: null,
      }
      db.invites.push(invite)
      db.inviteCreates.push({ user_id: user.id, at: now().toISOString() })
      persist()
      return { code: invite.code, expires_at: invite.expires_at }
    },

    async joinCouple(code: string): Promise<Couple> {
      const user = currentUser()
      const rejectCode = (): never => {
        const recent = db.joinFailures.filter((at) => now().getTime() - new Date(at).getTime() < HOUR_MS)
        db.joinFailures = recent
        if (recent.length >= 10) throw new ApiError(429, "Too many attempts. Try again later.")
        db.joinFailures.push(now().toISOString())
        persist()
        throw new ApiError(400, "That invite code is not valid.")
      }
      if (coupleFor(user.id)) throw new ApiError(409, "You already have a couple space.")
      const invite = db.invites.find((item) => item.code === code.trim())
      const expired = invite ? new Date(invite.expires_at).getTime() <= now().getTime() : true
      if (!invite || invite.used_at || expired) rejectCode()
      if (!invite) throw new ApiError(400, "That invite code is not valid.")
      const couple = db.couples.find((item) => item.id === invite.couple_id)
      if (!couple) {
        rejectCode()
        throw new ApiError(400, "That invite code is not valid.")
      }
      if (couple.members.length >= 2) throw new ApiError(409, "This space already has two people.")
      invite.used_at = now().toISOString()
      couple.members.push(memberFrom(user, now))
      db.presence.push({ user_id: user.id, free_to_talk: false, updated_at: now().toISOString() })
      persist()
      return clone(couple)
    },

    async listEvents(): Promise<EventItem[]> {
      const couple = requireCouple()
      return db.events
        .filter((item) => item.couple_id === couple.id)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map((item) => clone(item))
    },

    async createEvent(input: EventWrite): Promise<EventItem> {
      const user = currentUser()
      const couple = requireCouple()
      assertSpan(input.starts_at, input.ends_at)
      const stamp = now().toISOString()
      const event: EventItem = {
        id: newId(),
        couple_id: couple.id,
        created_by: user.id,
        title: requiredTitle(input.title),
        starts_at: input.starts_at,
        ends_at: input.ends_at ?? null,
        location: blankToNull(input.location),
        notes: blankToNull(input.notes),
        created_at: stamp,
        updated_at: stamp,
      }
      db.events.push(event)
      persist()
      return clone(event)
    },

    async deleteEvent(eventId: string): Promise<void> {
      const couple = requireCouple()
      const index = db.events.findIndex((item) => item.id === eventId && item.couple_id === couple.id)
      if (index < 0) throw new ApiError(404, "Event not found.")
      db.events.splice(index, 1)
      persist()
    },

    async listVisits(): Promise<Visit[]> {
      const couple = requireCouple()
      return db.visits
        .filter((item) => item.couple_id === couple.id)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map((item) => clone(item))
    },

    async createVisit(input: VisitWrite): Promise<Visit> {
      const user = currentUser()
      const couple = requireCouple()
      assertSpan(input.starts_at, input.ends_at, true)
      const stamp = now().toISOString()
      let budget = null
      if (input.budget) {
        if (couple.members.length < 2) throw new ApiError(409, "Both partners need to join before a budget.")
        const [first, second] = input.budget.shares
        if (!first || !second || first.amount_minor + second.amount_minor !== input.budget.total_minor) {
          throw new ApiError(422, "The two shares must add up to the total.")
        }
        budget = clone(input.budget)
      }
      const visit: Visit = {
        id: newId(),
        couple_id: couple.id,
        created_by: user.id,
        title: requiredTitle(input.title),
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        location: blankToNull(input.location),
        notes: blankToNull(input.notes),
        budget,
        created_at: stamp,
        updated_at: stamp,
      }
      db.visits.push(visit)
      persist()
      return clone(visit)
    },

    async getNextVisit(): Promise<Countdown> {
      const couple = requireCouple()
      const upcoming = db.visits
        .filter((item) => item.couple_id === couple.id && new Date(item.starts_at).getTime() > now().getTime())
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      const visit = upcoming[0]
      if (!visit) return { visit: null, seconds_until: null }
      const seconds = Math.floor((new Date(visit.starts_at).getTime() - now().getTime()) / 1000)
      return { visit: clone(visit), seconds_until: seconds }
    },

    async deleteVisit(visitId: string): Promise<void> {
      const couple = requireCouple()
      const index = db.visits.findIndex((item) => item.id === visitId && item.couple_id === couple.id)
      if (index < 0) throw new ApiError(404, "Visit not found.")
      db.visits.splice(index, 1)
      persist()
    },

    async putBudget(visitId: string, budget: Budget): Promise<Budget> {
      const couple = requireCouple()
      const visit = db.visits.find((item) => item.id === visitId && item.couple_id === couple.id)
      if (!visit) throw new ApiError(404, "Visit not found.")
      if (!/^[A-Z]{3}$/.test(budget.currency)) throw new ApiError(422, "Currency must be a 3-letter code.")
      if (couple.members.length < 2) throw new ApiError(409, "Both partners need to join before a budget.")
      const [first, second] = budget.shares
      if (!first || !second || budget.shares.length !== 2) {
        throw new ApiError(422, "A budget needs two shares.")
      }
      if (first.amount_minor < 0 || second.amount_minor < 0 || budget.total_minor < 0) {
        throw new ApiError(422, "Amounts cannot be negative.")
      }
      if (first.amount_minor + second.amount_minor !== budget.total_minor) {
        throw new ApiError(422, "The two shares must add up to the total.")
      }
      const memberIds = new Set(couple.members.map((member) => member.user_id))
      const shareIds = new Set([first.user_id, second.user_id])
      if (shareIds.size !== 2 || [...shareIds].some((id) => !memberIds.has(id))) {
        throw new ApiError(422, "Shares must belong to the two partners.")
      }
      visit.budget = clone(budget)
      visit.updated_at = now().toISOString()
      persist()
      return clone(budget)
    },

    async listCheckIns(): Promise<CheckIn[]> {
      const couple = requireCouple()
      return db.checkIns
        .filter((item) => item.couple_id === couple.id)
        .sort((a, b) => b.local_date.localeCompare(a.local_date))
        .map((item) => clone(item))
    },

    async upsertTodayCheckIn(input: CheckInWrite): Promise<CheckIn> {
      const user = currentUser()
      const couple = requireCouple()
      const note = cleanNote(input.note)
      const today = localDate(user.timezone, now())
      const stamp = now().toISOString()
      const existing = db.checkIns.find(
        (item) => item.user_id === user.id && item.local_date === today,
      )
      if (existing) {
        existing.mood = input.mood
        existing.note = note
        existing.updated_at = stamp
        persist()
        emit({ type: "check_in", check_in: clone(existing) })
        return clone(existing)
      }
      const created: CheckIn = {
        id: newId(),
        couple_id: couple.id,
        user_id: user.id,
        local_date: today,
        mood: input.mood,
        note,
        created_at: stamp,
        updated_at: stamp,
      }
      db.checkIns.push(created)
      persist()
      emit({ type: "check_in", check_in: clone(created) })
      return clone(created)
    },

    async listMemories(): Promise<Memory[]> {
      const couple = requireCouple()
      return db.memories
        .filter((item) => item.couple_id === couple.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((item) => clone(item))
    },

    async createMemory(input: MemoryWrite): Promise<Memory> {
      const user = currentUser()
      const couple = requireCouple()
      const stamp = now().toISOString()
      const memory: Memory = {
        id: newId(),
        couple_id: couple.id,
        author_id: user.id,
        title: cleanTitle(input.title),
        body: requiredBody(input.body),
        created_at: stamp,
        updated_at: stamp,
      }
      db.memories.push(memory)
      persist()
      return clone(memory)
    },

    async deleteMemory(memoryId: string): Promise<void> {
      const user = currentUser()
      const couple = requireCouple()
      const memory = db.memories.find((item) => item.id === memoryId && item.couple_id === couple.id)
      if (!memory || memory.author_id !== user.id) throw new ApiError(404, "Memory not found.")
      db.memories = db.memories.filter((item) => item.id !== memoryId)
      persist()
    },

    async getPresence() {
      const couple = requireCouple()
      const ids = new Set(couple.members.map((member) => member.user_id))
      return {
        members: db.presence.filter((item) => ids.has(item.user_id)).map((item) => clone(item)),
      }
    },

    async setPresence(freeToTalk: boolean) {
      const user = currentUser()
      requireCouple()
      const stamp = now().toISOString()
      const row = db.presence.find((item) => item.user_id === user.id)
      if (row) {
        row.free_to_talk = freeToTalk
        row.updated_at = stamp
      } else {
        db.presence.push({ user_id: user.id, free_to_talk: freeToTalk, updated_at: stamp })
      }
      persist()
      const listed = await this.getPresence()
      emit({ type: "presence", members: listed.members })
      return listed
    },

    subscribe(listener: (event: LiveEvent) => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export type MockClient = ReturnType<typeof createMockClient>

const DEMO_KEY = "closer-mock-db"

export async function createDemoClient(storage?: Store): Promise<MockClient> {
  const raw = storage?.getItem(DEMO_KEY)
  const db = raw ? (JSON.parse(raw) as Database) : await seedDatabase(new Date())
  if (!raw && storage) storage.setItem(DEMO_KEY, JSON.stringify(db))
  return createMockClient({
    db,
    storage,
    storageKey: storage ? DEMO_KEY : undefined,
  })
}

export async function seedDatabase(now: Date): Promise<Database> {
  const db = emptyDatabase()
  const client = createMockClient({ db, now: () => now })
  await client.register({
    email: "ada@example.com",
    password: "password123",
    display_name: "Ada",
    timezone: "Africa/Lagos",
  })
  await client.createCouple()
  const invite = await client.createInvite()
  client.useToken(null)
  await client.register({
    email: "bello@example.com",
    password: "password123",
    display_name: "Bello",
    timezone: "Europe/London",
  })
  await client.joinCouple(invite.code)
  const start = new Date(now.getTime() + 18 * 24 * HOUR_MS)
  const end = new Date(start.getTime() + 7 * 24 * HOUR_MS)
  const visit = await client.createVisit({
    title: "Lagos week",
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    location: "Lagos",
  })
  const couple = await client.getCurrentCouple()
  const ada = couple.members.find((member) => member.display_name === "Ada")
  const bello = couple.members.find((member) => member.display_name === "Bello")
  if (ada && bello) {
    await client.putBudget(visit.id, {
      currency: "NGN",
      total_minor: 25_000_000,
      shares: [
        { user_id: ada.user_id, amount_minor: 15_000_000 },
        { user_id: bello.user_id, amount_minor: 10_000_000 },
      ],
    })
  }
  await client.createEvent({
    title: "Book the same flight window",
    starts_at: new Date(now.getTime() + 3 * 24 * HOUR_MS).toISOString(),
    location: "Phone",
  })
  await client.upsertTodayCheckIn({ mood: "good", note: "Kitchen is finally quiet." })
  await client.createMemory({
    title: "Arrival hall",
    body: "You waved before I found the right exit.",
  })
  client.useToken(null)
  await client.login("ada@example.com", "password123")
  await client.upsertTodayCheckIn({ mood: "great", note: "Counted the days again." })
  await client.createMemory({ body: "The jollof at your sister's table." })
  client.useToken(null)
  return db
}

function memberFrom(user: StoredUser, now: () => Date): Member {
  return {
    user_id: user.id,
    display_name: user.display_name,
    timezone: user.timezone,
    joined_at: now().toISOString(),
  }
}

function requiredTitle(title: string): string {
  const cleaned = title.trim()
  if (cleaned.length < 1 || cleaned.length > 120) throw new ApiError(422, "Title must be 1 to 120 characters.")
  return cleaned
}

function requiredBody(body: string): string {
  const cleaned = body.trim()
  if (cleaned.length < 1 || cleaned.length > 2000) {
    throw new ApiError(422, "A memory needs 1 to 2000 characters.")
  }
  return cleaned
}

function cleanTitle(title: string | null | undefined): string | null {
  if (!title?.trim()) return null
  if (title.trim().length > 80) throw new ApiError(422, "Title must be at most 80 characters.")
  return title.trim()
}

function cleanNote(note: string | null | undefined): string | null {
  if (!note?.trim()) return null
  if (note.trim().length > 280) throw new ApiError(422, "Notes can be at most 280 characters.")
  return note.trim()
}

function blankToNull(value: string | null | undefined): string | null {
  const cleaned = value?.trim()
  return cleaned ? cleaned : null
}

function assertSpan(startsAt: string, endsAt: string | null | undefined, required = false): void {
  if (!endsAt) {
    if (required) throw new ApiError(422, "A visit needs an end.")
    return
  }
  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new ApiError(422, "End must be after the start.")
  }
}
