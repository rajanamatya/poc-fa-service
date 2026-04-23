import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

// In-memory todo storage (in production, you'd use a database)
let todos: Todo[] = [
  { id: '1', title: 'Learn Vue 3', completed: false, createdAt: new Date().toISOString() },
  { id: '2', title: 'Build a todo app', completed: false, createdAt: new Date().toISOString() },
  { id: '3', title: 'Deploy to AWS', completed: false, createdAt: new Date().toISOString() },
]

interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

/**
 * Parse a resource ID from the raw path.
 * Supports paths like /todos/123, /123, or /{proxy+} catch-all.
 */
function parseId(event: APIGatewayProxyEventV2): string | undefined {
  // Try named path parameter first (if route defines {id})
  if (event.pathParameters?.id) return event.pathParameters.id

  // Fall back to parsing rawPath — handles /{proxy+} and BFF-forwarded paths
  const segments = (event.rawPath || '/').split('/').filter(Boolean)
  // If path is like /todos/123 → id is last segment; if /123 → id is first segment
  return segments.length > 0 ? segments[segments.length - 1] : undefined
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method
  const body = event.body

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' }
  }

  // Root health check
  if (event.rawPath === '/' && method === 'GET') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ status: 'ok' }),
    }
  }

  const id = parseId(event)

  try {
    switch (method) {
      case 'GET':
        if (id && todos.some((t) => t.id === id)) {
          const todo = todos.find((t) => t.id === id)
          return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(todo) }
        }
        // List all
        return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(todos) }

      case 'POST': {
        const newTodo = JSON.parse(body || '{}')
        const todo: Todo = {
          id: Date.now().toString(),
          title: newTodo.title,
          completed: false,
          createdAt: new Date().toISOString(),
        }
        todos.push(todo)
        return { statusCode: 201, headers: corsHeaders, body: JSON.stringify(todo) }
      }

      case 'PUT':
        if (id) {
          const updateData = JSON.parse(body || '{}')
          const todoIndex = todos.findIndex((t) => t.id === id)
          if (todoIndex === -1) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ error: 'Todo not found' }),
            }
          }
          todos[todoIndex] = { ...todos[todoIndex], ...updateData }
          return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(todos[todoIndex]) }
        }
        break

      case 'DELETE':
        if (id) {
          const todoIndex = todos.findIndex((t) => t.id === id)
          if (todoIndex === -1) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ error: 'Todo not found' }),
            }
          }
          todos.splice(todoIndex, 1)
          return { statusCode: 204, headers: corsHeaders, body: '' }
        }
        break

      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' }),
        }
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }

  return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Bad request' }) }
}
