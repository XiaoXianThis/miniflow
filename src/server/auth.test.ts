import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { clearTables, closeDb, resetDbForTests } from '#/db'
import {
  AuthError,
  authenticateCredentials,
  createSessionForUser,
  createUser,
  deleteSession,
  getUserBySessionId,
  hashPassword,
  resetLoginAttemptsForTests,
  verifyPassword,
} from '#/server/auth'

const TEST_DB_PATH = 'data/test-auth.db'

describe('auth', () => {
  beforeAll(() => {
    process.env.DATABASE_PATH = TEST_DB_PATH
    resetDbForTests(TEST_DB_PATH)
  })

  beforeEach(() => {
    clearTables()
    resetLoginAttemptsForTests()
  })

  afterAll(() => {
    closeDb()
  })

  test('creates user with hashed password', async () => {
    await createUser('alice', 'password123')
    const user = await authenticateCredentials('alice', 'password123')

    expect(user.username).toBe('alice')
    expect(user.passwordHash).not.toBe('password123')
    expect(await verifyPassword('password123', user.passwordHash)).toBe(true)
  })

  test('rejects invalid password', async () => {
    await createUser('alice', 'password123')

    await expect(authenticateCredentials('alice', 'wrong-password')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    })
  })

  test('rejects unknown username without revealing existence', async () => {
    await expect(authenticateCredentials('ghost', 'password123')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: '用户名或密码错误',
    })
  })

  test('creates and validates session', async () => {
    await createUser('alice', 'password123')
    const user = await authenticateCredentials('alice', 'password123')
    const sessionId = await createSessionForUser(user.id)

    const sessionUser = await getUserBySessionId(sessionId)
    expect(sessionUser?.id).toBe(user.id)

    await deleteSession(sessionId)
    expect(await getUserBySessionId(sessionId)).toBeNull()
  })

  test('locks account after repeated failed logins', async () => {
    await createUser('alice', 'password123')

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(authenticateCredentials('alice', 'wrong-password')).rejects.toBeInstanceOf(
        AuthError,
      )
    }

    await expect(authenticateCredentials('alice', 'wrong-password')).rejects.toMatchObject({
      code: 'LOCKED',
    })
  })

  test('hashPassword produces verifiable hash', async () => {
    const hash = await hashPassword('secure-password')
    expect(await verifyPassword('secure-password', hash)).toBe(true)
    expect(await verifyPassword('other-password', hash)).toBe(false)
  })
})
