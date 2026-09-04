import { and, eq, gt } from 'drizzle-orm'
import {
  deleteCookie,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server'

import { getDb } from '#/db'
import { sessions, users, type User } from '#/db/schema'

export const SESSION_COOKIE = 'miniflow_session'
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000

export type PublicUser = Pick<User, 'id' | 'username'>

export class AuthError extends Error {
  readonly code: 'UNAUTHORIZED' | 'LOCKED' | 'INVALID_CREDENTIALS'

  constructor(
    message: string,
    code: 'UNAUTHORIZED' | 'LOCKED' | 'INVALID_CREDENTIALS' = 'UNAUTHORIZED',
  ) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

type LoginAttempt = {
  count: number
  lockedUntil?: number
}

const loginAttempts = new Map<string, LoginAttempt>()

function toPublicUser(user: User): PublicUser {
  return { id: user.id, username: user.username }
}

function getSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_MS)
}

function assertNotLocked(username: string) {
  const attempt = loginAttempts.get(username)
  if (!attempt?.lockedUntil) return

  if (Date.now() < attempt.lockedUntil) {
    throw new AuthError('登录尝试过多，请稍后再试', 'LOCKED')
  }

  loginAttempts.delete(username)
}

function recordFailedLogin(username: string) {
  const current = loginAttempts.get(username) ?? { count: 0 }
  const nextCount = current.count + 1

  if (nextCount >= MAX_LOGIN_ATTEMPTS) {
    loginAttempts.set(username, {
      count: nextCount,
      lockedUntil: Date.now() + LOCKOUT_MS,
    })
    return
  }

  loginAttempts.set(username, { count: nextCount })
}

function clearLoginAttempts(username: string) {
  loginAttempts.delete(username)
}

export async function hashPassword(password: string) {
  return Bun.password.hash(password, { algorithm: 'argon2id' })
}

export async function verifyPassword(password: string, passwordHash: string) {
  return Bun.password.verify(password, passwordHash)
}

export async function createUser(username: string, password: string) {
  const db = getDb()
  const now = new Date()

  await db.insert(users).values({
    id: crypto.randomUUID(),
    username,
    passwordHash: await hashPassword(password),
    isActive: true,
    createdAt: now,
  })
}

export async function createSessionForUser(userId: string) {
  const db = getDb()
  const now = new Date()
  const sessionId = crypto.randomUUID()

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt: getSessionExpiry(),
    createdAt: now,
  })

  return sessionId
}

export async function getUserBySessionId(sessionId: string) {
  const db = getDb()
  const now = new Date()

  const row = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(
      and(
        eq(sessions.id, sessionId),
        gt(sessions.expiresAt, now),
        eq(users.isActive, true),
      ),
    )
    .get()

  return row?.user ?? null
}

export async function deleteSession(sessionId: string) {
  const db = getDb()
  await db.delete(sessions).where(eq(sessions.id, sessionId))
}

export async function authenticateCredentials(
  username: string,
  password: string,
) {
  assertNotLocked(username)

  const db = getDb()
  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get()

  if (!user?.isActive) {
    recordFailedLogin(username)
    throw new AuthError('用户名或密码错误', 'INVALID_CREDENTIALS')
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    recordFailedLogin(username)
    throw new AuthError('用户名或密码错误', 'INVALID_CREDENTIALS')
  }

  clearLoginAttempts(username)
  return user
}

export async function requireAuth() {
  const sessionId = getCookie(SESSION_COOKIE)
  if (!sessionId) {
    throw new AuthError('未登录', 'UNAUTHORIZED')
  }

  const user = await getUserBySessionId(sessionId)
  if (!user) {
    throw new AuthError('会话无效或已过期', 'UNAUTHORIZED')
  }

  return user
}

export async function getCurrentUser() {
  const sessionId = getCookie(SESSION_COOKIE)
  if (!sessionId) return null

  const user = await getUserBySessionId(sessionId)
  return user ? toPublicUser(user) : null
}

export function setSessionCookie(sessionId: string) {
  setCookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
}

export async function loginWithCredentials(username: string, password: string) {
  const user = await authenticateCredentials(username, password)
  const sessionId = await createSessionForUser(user.id)
  setSessionCookie(sessionId)
  return toPublicUser(user)
}

export async function logoutCurrentSession() {
  const sessionId = getCookie(SESSION_COOKIE)
  if (sessionId) {
    await deleteSession(sessionId)
  }
  clearSessionCookie()
}

export function resetLoginAttemptsForTests() {
  loginAttempts.clear()
}

export async function updateUserPassword(username: string, password: string) {
  const db = getDb()
  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .get()

  if (!user) {
    throw new AuthError('用户不存在', 'INVALID_CREDENTIALS')
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.id, user.id))
}
