import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { desc, eq, sql } from 'drizzle-orm'
import { ConsentStatus, IntakeStatus, ReferralStatus, contacts, getDb, type NewContact } from './db'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const json = (statusCode: number, body: unknown): APIGatewayProxyResultV2 => ({
  statusCode,
  headers: corsHeaders,
  body: JSON.stringify(body),
})

const noContent: APIGatewayProxyResultV2 = { statusCode: 204, headers: corsHeaders, body: '' }

function parseId(event: APIGatewayProxyEventV2): string | undefined {
  if (event.pathParameters?.id) return event.pathParameters.id
  const segments = (event.rawPath || '/').split('/').filter(Boolean)
  return segments.length >= 2 ? segments[segments.length - 1] : undefined
}

const updatableFields = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'state',
  'notes',
  'intakeStatus',
  'referralStatus',
  'consentStatus',
  'consentGivenAt',
  'advisorId',
] as const satisfies readonly (keyof NewContact)[]

function pickDefined<T extends object, K extends keyof T>(source: T, keys: readonly K[]): Partial<Pick<T, K>> {
  const out: Partial<Pick<T, K>> = {}
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key]
  }
  return out
}

/**
 * Wire shape: timestamps arrive as ISO strings over JSON, and enum fields
 * arrive as plain strings. We coerce dates and validate enums against the
 * domain classes before letting Drizzle/Postgres see them.
 */
type ContactInput = Omit<Partial<NewContact>, 'consentGivenAt'> & { consentGivenAt?: string | Date | null }

class ValidationError extends Error {}

function parseBody(raw: string | undefined): Partial<NewContact> {
  const input = JSON.parse(raw || '{}') as ContactInput
  const { consentGivenAt, intakeStatus, referralStatus, consentStatus, ...rest } = input
  const result: Partial<NewContact> = rest

  if (consentGivenAt !== undefined) {
    result.consentGivenAt = consentGivenAt === null ? null : new Date(consentGivenAt)
  }
  if (intakeStatus !== undefined) {
    if (!IntakeStatus.is(intakeStatus)) {
      throw new ValidationError(`intakeStatus must be one of ${IntakeStatus.values.join(', ')}`)
    }
    result.intakeStatus = intakeStatus
  }
  if (referralStatus !== undefined) {
    if (!ReferralStatus.is(referralStatus)) {
      throw new ValidationError(`referralStatus must be one of ${ReferralStatus.values.join(', ')}`)
    }
    result.referralStatus = referralStatus
  }
  if (consentStatus !== undefined) {
    if (!ConsentStatus.is(consentStatus)) {
      throw new ValidationError(`consentStatus must be one of ${ConsentStatus.values.join(', ')}`)
    }
    result.consentStatus = consentStatus
  }
  return result
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method

  if (method === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' }
  if (event.rawPath === '/' && method === 'GET') return json(200, { status: 'ok' })

  try {
    const db = await getDb()
    const id = parseId(event)

    switch (method) {
      case 'GET': {
        if (id) {
          const [row] = await db.select().from(contacts).where(eq(contacts.clientId, id))
          return row ? json(200, row) : json(404, { error: 'Contact not found' })
        }
        const rows = await db.select().from(contacts).orderBy(desc(contacts.createdAt))
        return json(200, rows)
      }

      case 'POST': {
        const body = parseBody(event.body)
        if (!body.firstName || !body.lastName || !body.email || !body.state) {
          return json(400, { error: 'firstName, lastName, email, and state are required' })
        }
        const [row] = await db
          .insert(contacts)
          .values({
            advisorId: body.advisorId ?? null,
            firstName: body.firstName,
            lastName: body.lastName,
            email: body.email,
            phone: body.phone ?? null,
            state: body.state,
            notes: body.notes ?? null,
            intakeStatus: body.intakeStatus ?? IntakeStatus.default,
            referralStatus: body.referralStatus ?? ReferralStatus.default,
            consentStatus: body.consentStatus ?? ConsentStatus.default,
            consentGivenAt: body.consentGivenAt ?? null,
          })
          .returning()
        return json(201, row)
      }

      case 'PUT': {
        if (!id) return json(400, { error: 'Missing contact id' })
        const body = parseBody(event.body)
        const patch = pickDefined(body, updatableFields)
        if (Object.keys(patch).length === 0) return json(400, { error: 'No fields to update' })

        const [row] = await db
          .update(contacts)
          .set({ ...patch, updatedAt: sql`now()` })
          .where(eq(contacts.clientId, id))
          .returning()
        return row ? json(200, row) : json(404, { error: 'Contact not found' })
      }

      case 'DELETE': {
        if (!id) return json(400, { error: 'Missing contact id' })
        const deleted = await db
          .delete(contacts)
          .where(eq(contacts.clientId, id))
          .returning({ clientId: contacts.clientId })
        return deleted.length === 0 ? json(404, { error: 'Contact not found' }) : noContent
      }

      default:
        return json(405, { error: 'Method not allowed' })
    }
  } catch (error) {
    if (error instanceof ValidationError) return json(400, { error: error.message })
    if (error instanceof SyntaxError) return json(400, { error: 'Invalid JSON body' })
    console.error('Handler error:', error)
    return json(500, { error: 'Internal server error' })
  }
}
