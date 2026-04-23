import { Pool } from 'pg'

/**
 * Ensures the contacts table exists. Safe to call on every cold start —
 * uses IF NOT EXISTS so it's a no-op after the first run.
 */
export async function ensureSchema(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contacts (
      client_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      advisor_id       TEXT,
      first_name       TEXT NOT NULL,
      last_name        TEXT NOT NULL,
      email            TEXT NOT NULL,
      phone            TEXT,
      state            TEXT NOT NULL,
      notes            TEXT,
      intake_status    TEXT NOT NULL DEFAULT 'not_started'
        CHECK (intake_status IN ('not_started', 'in_progress', 'complete')),
      referral_status  TEXT NOT NULL DEFAULT 'none'
        CHECK (referral_status IN ('none', 'referred', 'viewed', 'connected')),
      consent_status   TEXT NOT NULL DEFAULT 'pending'
        CHECK (consent_status IN ('pending', 'accepted', 'declined')),
      consent_given_at TIMESTAMPTZ,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `)
}
