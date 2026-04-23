import { Pool } from 'pg'

/**
 * Ensures the todos table exists. Safe to call on every cold start —
 * uses IF NOT EXISTS so it's a no-op after the first run.
 */
export async function ensureSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title      TEXT NOT NULL,
      completed  BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}
