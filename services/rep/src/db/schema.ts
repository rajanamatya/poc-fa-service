import { sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
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

export const contacts = pgTable('contacts', {
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
})

export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
