import { sql } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import {
  ConsentStatus,
  IntakeStatus,
  ReferralStatus,
  consentStatusEnum,
  intakeStatusEnum,
  referralStatusEnum,
} from './enums'

export {
  ConsentStatus,
  IntakeStatus,
  ReferralStatus,
  consentStatusEnum,
  intakeStatusEnum,
  referralStatusEnum,
}
export type {
  ConsentStatusValue,
  IntakeStatusValue,
  ReferralStatusValue,
} from './enums'

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
    intakeStatus: intakeStatusEnum('intake_status').notNull().default(IntakeStatus.default),
    referralStatus: referralStatusEnum('referral_status').notNull().default(ReferralStatus.default),
    consentStatus: consentStatusEnum('consent_status').notNull().default(ConsentStatus.default),
    consentGivenAt: timestamp('consent_given_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // List view sorts newest-first.
    index('contacts_created_at_desc_idx').on(t.createdAt.desc()),
    // Tenant scoping: every advisor sees only their own contacts.
    index('contacts_advisor_id_idx').on(t.advisorId),
    // Name search: frontend matches `${firstName} ${lastName}`, lower-cased.
    // The functional index lets us do `WHERE lower(last_name || ' ' || first_name) LIKE ...`
    // without a sequential scan.
    index('contacts_full_name_lower_idx').on(
      sql`lower(${t.lastName} || ' ' || ${t.firstName})`,
    ),
    // Direct contact lookups.
    index('contacts_email_lower_idx').on(sql`lower(${t.email})`),
    index('contacts_phone_idx').on(t.phone),
    // Status filters exposed in the toolbar.
    index('contacts_intake_status_idx').on(t.intakeStatus),
    index('contacts_referral_status_idx').on(t.referralStatus),
  ],
)

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
