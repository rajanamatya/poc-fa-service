import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getPool } from './db'
import { ensureSchema } from './migrate'

let schemaReady = false

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

function parseId(event: APIGatewayProxyEventV2): string | undefined {
  if (event.pathParameters?.id) return event.pathParameters.id
  const segments = (event.rawPath || '/').split('/').filter(Boolean)
  return segments.length >= 2 ? segments[segments.length - 1] : undefined
}

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) }
}

const SELECT_COLS = `
  client_id AS "clientId",
  advisor_id AS "advisorId",
  first_name AS "firstName",
  last_name AS "lastName",
  email, phone, state, notes,
  intake_status AS "intakeStatus",
  referral_status AS "referralStatus",
  consent_status AS "consentStatus",
  consent_given_at AS "consentGivenAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  if (event.rawPath === '/' && method === 'GET') {
    return json(200, { status: 'ok' })
  }

  try {
    const pool = await getPool()
    if (!schemaReady) {
      await ensureSchema(pool)
      schemaReady = true
    }

    const id = parseId(event)

    switch (method) {
      case 'GET': {
        if (id) {
          const { rows } = await pool.query(
            `SELECT ${SELECT_COLS} FROM contacts WHERE client_id = $1`,
            [id],
          )
          if (rows.length === 0) return json(404, { error: 'Contact not found' })
          return json(200, rows[0])
        }
        const { rows } = await pool.query(
          `SELECT ${SELECT_COLS} FROM contacts ORDER BY created_at DESC`,
        )
        return json(200, rows)
      }

      case 'POST': {
        const b = JSON.parse(event.body || '{}')
        if (!b.firstName || !b.lastName || !b.email || !b.state) {
          return json(400, { error: 'firstName, lastName, email, and state are required' })
        }
        const { rows } = await pool.query(
          `INSERT INTO contacts (advisor_id, first_name, last_name, email, phone, state, notes,
             intake_status, referral_status, consent_status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING ${SELECT_COLS}`,
          [
            b.advisorId ?? null,
            b.firstName,
            b.lastName,
            b.email,
            b.phone ?? null,
            b.state,
            b.notes ?? null,
            b.intakeStatus ?? 'not_started',
            b.referralStatus ?? 'none',
            b.consentStatus ?? 'pending',
          ],
        )
        return json(201, rows[0])
      }

      case 'PUT': {
        if (!id) return json(400, { error: 'Missing contact id' })
        const b = JSON.parse(event.body || '{}')
        const allowed: Record<string, string> = {
          firstName: 'first_name', lastName: 'last_name', email: 'email',
          phone: 'phone', state: 'state', notes: 'notes',
          intakeStatus: 'intake_status', referralStatus: 'referral_status',
          consentStatus: 'consent_status', consentGivenAt: 'consent_given_at',
          advisorId: 'advisor_id',
        }
        const fields: string[] = []
        const values: unknown[] = []
        let idx = 1
        for (const [key, col] of Object.entries(allowed)) {
          if (b[key] !== undefined) {
            fields.push(`${col} = $${idx++}`)
            values.push(b[key])
          }
        }
        if (fields.length === 0) return json(400, { error: 'No fields to update' })
        fields.push(`updated_at = now()`)
        values.push(id)
        const { rows } = await pool.query(
          `UPDATE contacts SET ${fields.join(', ')} WHERE client_id = $${idx} RETURNING ${SELECT_COLS}`,
          values,
        )
        if (rows.length === 0) return json(404, { error: 'Contact not found' })
        return json(200, rows[0])
      }

      case 'DELETE': {
        if (!id) return json(400, { error: 'Missing contact id' })
        const { rowCount } = await pool.query('DELETE FROM contacts WHERE client_id = $1', [id])
        if (rowCount === 0) return json(404, { error: 'Contact not found' })
        return { statusCode: 204, headers: corsHeaders, body: '' }
      }

      default:
        return json(405, { error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Handler error:', error)
    return json(500, { error: 'Internal server error' })
  }
}
