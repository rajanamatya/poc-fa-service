import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { desc, eq, sql } from 'drizzle-orm'
import { contacts, getDb, type NewContact } from './db'

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
 * Wire shape: timestamps arrive as ISO strings over JSON. Drizzle's `date` mode
 * expects real Date instances, so we coerce at the boundary.
 */
type ContactInput = Omit<Partial<NewContact>, 'consentGivenAt'> & { consentGivenAt?: string | Date | null }

function parseBody(raw: string | undefined): Partial<NewContact> {
  const input = JSON.parse(raw || '{}') as ContactInput
  const { consentGivenAt, ...rest } = input
  const result: Partial<NewContact> = rest
  if (consentGivenAt !== undefined) {
    result.consentGivenAt = consentGivenAt === null ? null : new Date(consentGivenAt)
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
            intakeStatus: body.intakeStatus ?? 'not_started',
            referralStatus: body.referralStatus ?? 'none',
            consentStatus: body.consentStatus ?? 'pending',
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
    console.error('Handler error:', error)
    return json(500, { error: 'Internal server error' })
  }
}
