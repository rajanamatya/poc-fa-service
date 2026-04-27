/**
 * Domain enums.
 *
 * Each enum is exposed in two forms:
 *
 * - A `pgEnum` instance used by the Drizzle schema, so the database column is
 *   a real PostgreSQL ENUM type (CREATE TYPE ... AS ENUM) instead of TEXT +
 *   CHECK constraint. This gives us catalog-level validation.
 *
 * - A small TS class with named constants, the full value list and a type
 *   guard. The class lets call sites read like `IntakeStatus.IN_PROGRESS`
 *   instead of magic strings.
 */
import { pgEnum } from 'drizzle-orm/pg-core'

/* ---------- Intake status ------------------------------------------------ */

export const intakeStatusEnum = pgEnum('intake_status', [
  'not_started',
  'in_progress',
  'complete',
])

export class IntakeStatus {
  static readonly NOT_STARTED = 'not_started' as const
  static readonly IN_PROGRESS = 'in_progress' as const
  static readonly COMPLETE = 'complete' as const

  static readonly values = intakeStatusEnum.enumValues
  static readonly default: IntakeStatusValue = IntakeStatus.NOT_STARTED

  static is(value: unknown): value is IntakeStatusValue {
    return typeof value === 'string' && (this.values as readonly string[]).includes(value)
  }
}
export type IntakeStatusValue = (typeof intakeStatusEnum.enumValues)[number]

/* ---------- Referral status --------------------------------------------- */

export const referralStatusEnum = pgEnum('referral_status', [
  'none',
  'referred',
  'viewed',
  'connected',
])

export class ReferralStatus {
  static readonly NONE = 'none' as const
  static readonly REFERRED = 'referred' as const
  static readonly VIEWED = 'viewed' as const
  static readonly CONNECTED = 'connected' as const

  static readonly values = referralStatusEnum.enumValues
  static readonly default: ReferralStatusValue = ReferralStatus.NONE

  static is(value: unknown): value is ReferralStatusValue {
    return typeof value === 'string' && (this.values as readonly string[]).includes(value)
  }
}
export type ReferralStatusValue = (typeof referralStatusEnum.enumValues)[number]

/* ---------- Consent status ---------------------------------------------- */

export const consentStatusEnum = pgEnum('consent_status', [
  'pending',
  'accepted',
  'declined',
])

export class ConsentStatus {
  static readonly PENDING = 'pending' as const
  static readonly ACCEPTED = 'accepted' as const
  static readonly DECLINED = 'declined' as const

  static readonly values = consentStatusEnum.enumValues
  static readonly default: ConsentStatusValue = ConsentStatus.PENDING

  static is(value: unknown): value is ConsentStatusValue {
    return typeof value === 'string' && (this.values as readonly string[]).includes(value)
  }
}
export type ConsentStatusValue = (typeof consentStatusEnum.enumValues)[number]
