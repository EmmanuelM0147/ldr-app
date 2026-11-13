import type {
  AppNotification,
  AuthResponse,
  Budget,
  CheckIn,
  CheckInWrite,
  Countdown,
  Couple,
  EventItem,
  EventWrite,
  ForgotPasswordResponse,
  InviteCreated,
  LiveEvent,
  Memory,
  MemoryWrite,
  Member,
  NotificationKind,
  Presence,
  RegisterRequest,
  ResetPasswordResponse,
  User,
  Visit,
  CouplePatch,
  DateIdeas,
  DateIdeasRequest,
  UserPatch,
  VisitWrite,
} from "../types"
import { localDate } from "../format"
import { ApiError } from "./errors"

type StoredUser = User & { password_mark: string; avatar_data?: string | null }

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
  notifications: AppNotification[]
  inviteCreates: { user_id: string; at: string }[]
  joinFailures: string[]
  passwordResets: { token: string; user_id: string; expires_at: string; used_at: string | null }[]
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
    notifications: [],
    inviteCreates: [],
    joinFailures: [],
    passwordResets: [],
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
    avatar_url: user.avatar_data ? `/users/${user.id}/avatar` : null,
  }
}

function syncMemberAvatars(db: Database, user: StoredUser): void {
  for (const couple of db.couples) {
    for (const member of couple.members) {
      if (member.user_id === user.id) {
        member.display_name = user.display_name
        member.timezone = user.timezone
        member.avatar_url = user.avatar_data ? `/users/${user.id}/avatar` : null
      }
    }
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

type LivePeer = {
  dispatch: (event: LiveEvent) => void
  userId: () => string | null
}

const livePeers = new WeakMap<object, Set<LivePeer>>()

function peersFor(db: object): Set<LivePeer> {
  let peers = livePeers.get(db)
  if (!peers) {
    peers = new Set()
    livePeers.set(db, peers)
  }
  return peers
}

export function createMockClient(options: Options = {}) {
  const now = options.now ?? (() => new Date())
  const db = options.db ?? emptyDatabase()
  let token: string | null = null
  const listeners = new Set<(event: LiveEvent) => void>()

  const emitLocal = (event: LiveEvent) => {
    for (const listener of listeners) listener(event)
  }

  const peer: LivePeer = {
    dispatch: emitLocal,
    userId: () => {
      const session = db.sessions.find((item) => item.token === token)
      return session?.user_id ?? null
    },
  }
  peersFor(db).add(peer)

  const emit = (event: LiveEvent, coupleId?: string) => {
    emitLocal(event)
    if (!coupleId) return
    const couple = db.couples.find((item) => item.id === coupleId)
    if (!couple) return
    const memberIds = new Set(couple.members.map((member) => member.user_id))
    for (const other of peersFor(db)) {
      if (other === peer) continue
      const userId = other.userId()
      if (userId && memberIds.has(userId)) other.dispatch(event)
    }
  }

  const notifyPartners = (
    couple: Couple,
    actorUserId: string,
    kind: NotificationKind,
    title: string,
    body: string,
  ) => {
    const stamp = now().toISOString()
    for (const member of couple.members) {
      if (member.user_id === actorUserId) continue
      const row: AppNotification = {
        id: newId(),
        couple_id: couple.id,
        recipient_user_id: member.user_id,
        kind,
        title,
        body,
        created_at: stamp,
        read_at: null,
      }
      db.notifications.push(row)
      emit({ type: "notification", notification: clone(row) }, couple.id)
    }
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
        throw new ApiError(409, "Unable to create an account with that email.")
      }
      const user: StoredUser = {
        id: newId(),
        email,
        display_name: displayName,
        timezone,
        created_at: now().toISOString(),
        avatar_url: null,
        avatar_data: null,
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

    async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
      const normalized = email.trim().toLowerCase()
      const detail = "If that email is registered, use the reset link to choose a new password."
      const user = db.users.find((item) => item.email === normalized)
      if (!user) return { detail, reset_url: null }
      const token = newCode()
      db.passwordResets.push({
        token,
        user_id: user.id,
        expires_at: new Date(now().getTime() + HOUR_MS).toISOString(),
        used_at: null,
      })
      return {
        detail,
        reset_url: `http://localhost:5173/reset-password?token=${token}`,
      }
    },

    async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponse> {
      if (newPassword.length < 8 || newPassword.length > 72) {
        throw new ApiError(422, "Password must be 8 to 72 characters.")
      }
      const row = db.passwordResets.find((item) => item.token === token.trim())
      if (!row || row.used_at || new Date(row.expires_at).getTime() <= now().getTime()) {
        throw new ApiError(400, "Invalid or expired reset link.")
      }
      const user = db.users.find((item) => item.id === row.user_id)
      if (!user) throw new ApiError(400, "Invalid or expired reset link.")
      user.password_mark = `mock:${newPassword}`
      row.used_at = now().toISOString()
      for (const other of db.passwordResets) {
        if (other.user_id === user.id && other.used_at === null) other.used_at = now().toISOString()
      }
      return { detail: "Password updated. You can sign in." }
    },

    async getMe(): Promise<User> {
      return publicUser(currentUser())
    },

    async updateMe(input: UserPatch): Promise<User> {
      const user = currentUser()
      if (input.display_name !== undefined) {
        const name = input.display_name.trim()
        if (name.length < 1 || name.length > 40) throw new ApiError(422, "Display name must be 1 to 40 characters.")
        user.display_name = name
      }
      if (input.timezone !== undefined) {
        assertTimezone(input.timezone)
        user.timezone = input.timezone
      }
      if (input.new_password !== undefined) {
        if (!input.current_password || user.password_mark !== `mock:${input.current_password}`) {
          throw new ApiError(422, "Current password is wrong.")
        }
        if (input.new_password.length < 8) throw new ApiError(422, "Password must be 8 to 72 characters.")
        user.password_mark = `mock:${input.new_password}`
      } else if (input.current_password !== undefined) {
        throw new ApiError(422, "Provide a new password to change it.")
      }
      syncMemberAvatars(db, user)
      persist()
      return publicUser(user)
    },

    async uploadMyAvatar(file: File): Promise<User> {
      const user = currentUser()
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        throw new ApiError(422, "Use a JPEG, PNG, or WebP photo.")
      }
      if (file.size === 0 || file.size > 5 * 1024 * 1024) {
        throw new ApiError(422, "That photo is too large (max 5 MiB).")
      }
      user.avatar_data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new ApiError(422, "Could not read that file."))
        reader.readAsDataURL(file)
      })
      syncMemberAvatars(db, user)
      persist()
      return publicUser(user)
    },

    async deleteMyAvatar(): Promise<User> {
      const user = currentUser()
      user.avatar_data = null
      syncMemberAvatars(db, user)
      persist()
      return publicUser(user)
    },

    async getUserAvatar(userId: string): Promise<Blob> {
      const caller = currentUser()
      const target = db.users.find((item) => item.id === userId)
      if (!target?.avatar_data) throw new ApiError(404, "Not found.")
      if (caller.id !== target.id) {
        const callerCouple = coupleFor(caller.id)
        const targetCouple = coupleFor(target.id)
        if (!callerCouple || !targetCouple || callerCouple.id !== targetCouple.id) {
          throw new ApiError(404, "Not found.")
        }
      }
      const response = await fetch(target.avatar_data)
      return response.blob()
    },

    async createCouple(): Promise<Couple> {
      const user = currentUser()
      if (coupleFor(user.id)) throw new ApiError(409, "You already have a couple space.")
      const couple: Couple = {
        id: newId(),
        ai_enabled: false,
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

    async updateCurrentCouple(input: CouplePatch): Promise<Couple> {
      const couple = requireCouple()
      if (input.ai_enabled === undefined) throw new ApiError(422, "Nothing to update.")
      couple.ai_enabled = input.ai_enabled
      persist()
      return clone(couple)
    },

    async deleteCurrentCouple(): Promise<void> {
      const couple = requireCouple()
      const id = couple.id
      emit({ type: "couple_gone" }, id)
      db.couples = db.couples.filter((item) => item.id !== id)
      db.invites = db.invites.filter((item) => item.couple_id !== id)
      db.events = db.events.filter((item) => item.couple_id !== id)
      db.visits = db.visits.filter((item) => item.couple_id !== id)
      db.checkIns = db.checkIns.filter((item) => item.couple_id !== id)
      db.memories = db.memories.filter((item) => item.couple_id !== id)
      db.notifications = db.notifications.filter((item) => item.couple_id !== id)
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
      const updated = clone(couple)
      emit({ type: "partner_joined", couple: updated }, couple.id)
      notifyPartners(couple, user.id, "partner_joined", "Partner joined", `${user.display_name} joined your space.`)
      persist()
      return updated
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
      notifyPartners(couple, user.id, "event_created", "New event", `${user.display_name} added '${event.title}'.`)
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
      const traveler = input.traveler_user_id ?? null
      if (traveler && !couple.members.some((member) => member.user_id === traveler)) {
        throw new ApiError(422, "Traveler must be a member of this space.")
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
        traveler_user_id: traveler,
        budget,
        created_at: stamp,
        updated_at: stamp,
      }
      db.visits.push(visit)
      notifyPartners(couple, user.id, "visit_created", "New visit", `${user.display_name} added '${visit.title}'.`)
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
        emit({ type: "check_in", check_in: clone(existing) }, couple.id)
        notifyPartners(
          couple,
          user.id,
          "check_in",
          "Check-in",
          `${user.display_name} checked in (${input.mood}).`,
        )
        persist()
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
      emit({ type: "check_in", check_in: clone(created) }, couple.id)
      notifyPartners(couple, user.id, "check_in", "Check-in", `${user.display_name} checked in (${input.mood}).`)
      persist()
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
      const id = newId()
      let media = null
      if (input.file) {
        media = await fileToMedia(input.file, id)
      }
      const bodyText = input.body?.trim() ?? ""
      if (!media && !bodyText) throw new ApiError(422, "A memory needs 1 to 2000 characters.")
      if (bodyText.length > 2000) throw new ApiError(422, "A memory needs 1 to 2000 characters.")
      const memory: Memory = {
        id,
        couple_id: couple.id,
        author_id: user.id,
        title: cleanTitle(input.title),
        body: media ? bodyText : requiredBody(input.body),
        media,
        created_at: stamp,
        updated_at: stamp,
      }
      db.memories.push(memory)
      persist()
      return clone(memory)
    },

    async getMemoryMedia(memoryId: string): Promise<Blob> {
      const couple = requireCouple()
      const memory = db.memories.find((item) => item.id === memoryId && item.couple_id === couple.id)
      if (!memory?.media) throw new ApiError(404, "Media not found.")
      const response = await fetch(memory.media.url)
      return response.blob()
    },

    async deleteMemory(memoryId: string): Promise<void> {
      const user = currentUser()
      const couple = requireCouple()
      const memory = db.memories.find((item) => item.id === memoryId && item.couple_id === couple.id)
      if (!memory || memory.author_id !== user.id) throw new ApiError(404, "Memory not found.")
      db.memories = db.memories.filter((item) => item.id !== memoryId)
      persist()
    },

    async listNotifications(): Promise<AppNotification[]> {
      const user = currentUser()
      const couple = requireCouple()
      return db.notifications
        .filter((item) => item.couple_id === couple.id && item.recipient_user_id === user.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((item) => clone(item))
    },

    async markNotificationRead(notificationId: string): Promise<AppNotification> {
      const user = currentUser()
      const couple = requireCouple()
      const row = db.notifications.find(
        (item) =>
          item.id === notificationId && item.couple_id === couple.id && item.recipient_user_id === user.id,
      )
      if (!row) throw new ApiError(404, "Notification not found.")
      if (!row.read_at) row.read_at = now().toISOString()
      persist()
      return clone(row)
    },

    async markAllNotificationsRead(): Promise<void> {
      const user = currentUser()
      const couple = requireCouple()
      const stamp = now().toISOString()
      for (const row of db.notifications) {
        if (row.couple_id === couple.id && row.recipient_user_id === user.id && !row.read_at) {
          row.read_at = stamp
        }
      }
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
      const couple = requireCouple()
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
      emit({ type: "presence", members: listed.members }, couple.id)
      return listed
    },

    async createDateIdeas(input: DateIdeasRequest): Promise<DateIdeas> {
      const couple = requireCouple()
      if (!couple.ai_enabled) throw new ApiError(403, "Turn on AI ideas in settings first.")
      const mood = input.mood?.trim()
      const modeLabel = input.mode === "apart" ? "while apart" : "in person"
      return {
        ideas: [
          {
            title: mood ? `${mood} evening ${modeLabel}` : `Easy date ${modeLabel}`,
            description: `A ${input.duration_minutes}-minute plan within about ${input.budget}: keep it simple and phone-free.`,
            est_cost: input.budget,
          },
          {
            title: "Shared meal",
            description: "Cook or order the same dish, eat together, and leave one quiet hour after.",
            est_cost: input.budget,
          },
          {
            title: "Short walk and talk",
            description: "Walk somewhere nearby or call while each of you walks, then share one highlight.",
            est_cost: "free-low",
          },
        ],
      }
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
  if (!db.passwordResets) db.passwordResets = []
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
    avatar_url: user.avatar_data ? `/users/${user.id}/avatar` : null,
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

async function fileToMedia(file: File, memoryId: string) {
  const type = file.type
  const kind = type.startsWith("image/") ? "image" : type.startsWith("video/") ? "video" : null
  if (!kind || !["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"].includes(type)) {
    throw new ApiError(422, "Use a JPEG, PNG, WebP photo or an MP4/WebM video.")
  }
  const max = kind === "image" ? 10 * 1024 * 1024 : 40 * 1024 * 1024
  if (file.size === 0 || file.size > max) {
    throw new ApiError(422, kind === "image" ? "That file is too large (max 10 MiB)." : "That file is too large (max 40 MiB).")
  }
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new ApiError(422, "Could not read that file."))
    reader.readAsDataURL(file)
  })
  return {
    kind: kind as "image" | "video",
    content_type: type,
    filename: file.name || `memory-${memoryId}`,
    url,
  }
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
