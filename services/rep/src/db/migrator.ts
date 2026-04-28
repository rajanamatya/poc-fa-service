/**
 * Up/down migrations on top of drizzle-kit.
 *
 * drizzle-kit owns the `up` workflow and the journal in `migrations/meta/`.
 * Each generated `0000_xxx.sql` is paired with a hand-written
 * `0000_xxx.down.sql` that reverts it. We track applied migrations in the same
 * `drizzle.__drizzle_migrations` table the official migrator writes to, and
 * map drizzle's content hash back to the journal tag so up/down stay in sync.
 *
 * Usage:
 *   tsx src/db/migrator.ts up        # apply all pending migrations
 *   tsx src/db/migrator.ts down      # revert the most recently applied
 *   tsx src/db/migrator.ts status    # list applied + pending
 */
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Database, closeDb, getDb } from './client'

interface JournalEntry {
  idx: number
  tag: string
  when: number
  breakpoints: boolean
  version: string
}
interface Journal {
  version: string
  dialect: string
  entries: JournalEntry[]
}

const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations')
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, 'meta', '_journal.json')
const TRACKING_TABLE = '"drizzle"."__drizzle_migrations"'

async function readJournal(): Promise<Journal> {
  return JSON.parse(await readFile(JOURNAL_PATH, 'utf8')) as Journal
}

async function migrationHash(tag: string): Promise<string> {
  const text = await readFile(path.join(MIGRATIONS_DIR, `${tag}.sql`), 'utf8')
  return createHash('sha256').update(text).digest('hex')
}

async function trackingTableExists(): Promise<boolean> {
  const { pool } = await Database.connect()
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'
     ) AS exists`,
  )
  return rows[0]?.exists ?? false
}

/** Returns the set of journal tags currently recorded as applied. */
async function appliedTags(): Promise<Set<string>> {
  if (!(await trackingTableExists())) return new Set()

  const { pool } = await Database.connect()
  const { rows } = await pool.query<{ hash: string }>(`SELECT hash FROM ${TRACKING_TABLE}`)
  const applied = new Set(rows.map((r) => r.hash))

  const journal = await readJournal()
  const tags = new Set<string>()
  for (const entry of journal.entries) {
    if (applied.has(await migrationHash(entry.tag))) tags.add(entry.tag)
  }
  return tags
}

export async function up(): Promise<void> {
  const db = await getDb()
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR })
}

export async function down(): Promise<void> {
  if (!(await trackingTableExists())) {
    console.log('Nothing to roll back')
    return
  }

  const { pool } = await Database.connect()
  const { rows } = await pool.query<{ id: number; hash: string }>(
    `SELECT id, hash FROM ${TRACKING_TABLE} ORDER BY created_at DESC LIMIT 1`,
  )
  const last = rows[0]
  if (!last) {
    console.log('Nothing to roll back')
    return
  }

  const journal = await readJournal()
  let target: JournalEntry | undefined
  for (const entry of journal.entries) {
    if ((await migrationHash(entry.tag)) === last.hash) {
      target = entry
      break
    }
  }
  if (!target) throw new Error(`No journal entry matches applied hash ${last.hash}`)

  const downFile = path.join(MIGRATIONS_DIR, `${target.tag}.down.sql`)
  let sqlText: string
  try {
    sqlText = await readFile(downFile, 'utf8')
  } catch {
    throw new Error(`Missing down migration: ${path.relative(process.cwd(), downFile)}`)
  }

  console.log(`Rolling back ${target.tag}`)
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const stmt of sqlText.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim()
      if (trimmed) await client.query(trimmed)
    }
    await client.query(`DELETE FROM ${TRACKING_TABLE} WHERE id = $1`, [last.id])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function status(): Promise<void> {
  const journal = await readJournal()
  const applied = await appliedTags()
  console.log('Migrations:')
  for (const entry of journal.entries) {
    const mark = applied.has(entry.tag) ? '[applied]' : '[pending]'
    console.log(`  ${mark}  ${entry.tag}`)
  }
}

const COMMANDS = { up, down, status } as const
type Command = keyof typeof COMMANDS

const isCli = process.argv[1]?.endsWith('migrator.ts') || process.argv[1]?.endsWith('migrator.js')

if (isCli) {
  const cmd = (process.argv[2] ?? 'up') as Command
  const fn = COMMANDS[cmd]
  if (!fn) {
    console.error(`Unknown command "${cmd}". Use one of: ${Object.keys(COMMANDS).join(', ')}`)
    process.exit(1)
  }
  fn()
    .then(() => cmd !== 'status' && console.log('Done'))
    .catch((err) => {
      console.error('Migration failed:', err)
      process.exitCode = 1
    })
    .finally(() => closeDb())
}
