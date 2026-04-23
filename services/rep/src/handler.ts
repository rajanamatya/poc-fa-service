import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getPool } from './db'
import { ensureSchema } from './migrate'

let schemaReady = false

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

/** Parse a resource ID from the raw path (supports /{proxy+} catch-all). */
function parseId(event: APIGatewayProxyEventV2): string | undefined {
  if (event.pathParameters?.id) return event.pathParameters.id
  const segments = (event.rawPath || '/').split('/').filter(Boolean)
  // /todos/abc123 → last segment is the id
  return segments.length >= 2 ? segments[segments.length - 1] : undefined
}

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: corsHeaders, body: JSON.stringify(body) }
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  // Health check
  if (event.rawPath === '/' && method === 'GET') {
    return json(200, { status: 'ok' })
  }

  try {
    const pool = await getPool()

    // Run migration once per cold start
    if (!schemaReady) {
      await ensureSchema(pool)
      schemaReady = true
    }

    const id = parseId(event)

    switch (method) {
      case 'GET': {
        if (id) {
          const { rows } = await pool.query(
            'SELECT id, title, completed, created_at AS "createdAt" FROM todos WHERE id = $1',
            [id],
          )
          if (rows.length === 0) return json(404, { error: 'Todo not found' })
          return json(200, rows[0])
        }
        const { rows } = await pool.query(
          'SELECT id, title, completed, created_at AS "createdAt" FROM todos ORDER BY created_at DESC',
        )
        return json(200, rows)
      }

      case 'POST': {
        const { title } = JSON.parse(event.body || '{}')
        if (!title) return json(400, { error: 'title is required' })
        const { rows } = await pool.query(
          'INSERT INTO todos (title) VALUES ($1) RETURNING id, title, completed, created_at AS "createdAt"',
          [title],
        )
        return json(201, rows[0])
      }

      case 'PUT': {
        if (!id) return json(400, { error: 'Missing todo id' })
        const updates = JSON.parse(event.body || '{}')
        const fields: string[] = []
        const values: unknown[] = []
        let idx = 1

        if (updates.title !== undefined) {
          fields.push(`title = $${idx++}`)
          values.push(updates.title)
        }
        if (updates.completed !== undefined) {
          fields.push(`completed = $${idx++}`)
          values.push(updates.completed)
        }
        if (fields.length === 0) return json(400, { error: 'No fields to update' })

        values.push(id)
        const { rows } = await pool.query(
          `UPDATE todos SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, title, completed, created_at AS "createdAt"`,
          values,
        )
        if (rows.length === 0) return json(404, { error: 'Todo not found' })
        return json(200, rows[0])
      }

      case 'DELETE': {
        if (!id) return json(400, { error: 'Missing todo id' })
        const { rowCount } = await pool.query('DELETE FROM todos WHERE id = $1', [id])
        if (rowCount === 0) return json(404, { error: 'Todo not found' })
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
