import { sql } from 'drizzle-orm'
import { check, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const intakeStatuses = ['not_started', 'in_progress', 'complete'] as const
export const referralStatuses = ['none', 'referred', 'viewed', 'connected'] as const
export const consentStatuses = ['pending', 'accepted', 'declined'] as const

export type IntakeStatus = (typeof intakeStatuses)[number]
export type ReferralStatus = (typeof referralStatuses)[number]
export type ConsentStatus = (typeof consentStatuses)[number]

export const contacts = pgTable(
  'contacts',
  {
    clientId: uuid('client_id').primaryKey().default(sql`gen_random_uuid()`),
    advisorId: text('advisor_id'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    state: text('state').notNull(),
    notes: text('notes'),
    intakeStatus: text('intake_status').$type<IntakeStatus>().notNull().default('not_started'),
    referralStatus: text('referral_status').$type<ReferralStatus>().notNull().default('none'),
    consentStatus: text('consent_status').$type<ConsentStatus>().notNull().default('pending'),
    consentGivenAt: timestamp('consent_given_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('contacts_intake_status_check', sql`${t.intakeStatus} IN ('not_started', 'in_progress', 'complete')`),
    check('contacts_referral_status_check', sql`${t.referralStatus} IN ('none', 'referred', 'viewed', 'connected')`),
    check('contacts_consent_status_check', sql`${t.consentStatus} IN ('pending', 'accepted', 'declined')`),
  ],
)

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
