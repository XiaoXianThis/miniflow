import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'

import * as schema from './schema'

const DEFAULT_DB_PATH = 'data/miniflow.db'

function resolveDatabasePath() {
  return process.env.DATABASE_PATH ?? DEFAULT_DB_PATH
}

let dbInstance: ReturnType<typeof createDb> | undefined
let migrated = false

function createDb(path: string) {
  const directory = dirname(path)
  if (directory && directory !== '.') {
    mkdirSync(directory, { recursive: true })
  }

  const sqlite = new Database(path)
  sqlite.exec('PRAGMA foreign_keys = ON')
  return drizzle(sqlite, { schema })
}

function getSqliteClient(db: ReturnType<typeof createDb>) {
  return (db as unknown as { $client: Database }).$client
}

export function clearTables() {
  const sqlite = getSqliteClient(getDb())
  sqlite.exec('DELETE FROM sessions; DELETE FROM users;')
}

export function closeDb() {
  if (!dbInstance) return

  getSqliteClient(dbInstance).close()
  dbInstance = undefined
  migrated = false
}

export function migrateDb(db = getDb()) {
  const sqlite = getSqliteClient(db)

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);
  `)
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = createDb(resolveDatabasePath())
  }

  if (!migrated) {
    migrateDb(dbInstance)
    migrated = true
  }

  return dbInstance
}

export function resetDbForTests(path: string) {
  closeDb()
  dbInstance = createDb(path)
  migrated = false
  migrateDb(dbInstance)
  migrated = true
  return dbInstance
}
