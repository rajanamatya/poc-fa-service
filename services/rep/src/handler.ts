import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

// In-memory todo storage (in production, you'd use a database)
let todos: Todo[] = [
  { id: '1', title: 'Learn Vue 3', completed: false, createdAt: new Date().toISOString() },
  { id: '2', title: 'Build a todo app', completed: false, createdAt: new Date().toISOString() },
  { id: '3', title: 'Deploy to AWS', completed: false, createdAt: new Date().toISOString() }
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
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method
  const pathParameters = event.pathParameters
  const body = event.body
  
  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    }
  }

  try {
    switch (method) {
      case 'GET':
        if (pathParameters?.id) {
          // Get single todo
          const todo = todos.find(t => t.id === pathParameters.id)
          if (!todo) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ error: 'Todo not found' })
            }
          }
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(todo)
          }
        } else {
          // Get all todos
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(todos)
          }
        }

      case 'POST':
        const newTodo = JSON.parse(body || '{}')
        const todo: Todo = {
          id: Date.now().toString(),
          title: newTodo.title,
          completed: false,
          createdAt: new Date().toISOString()
        }
        todos.push(todo)
        return {
          statusCode: 201,
          headers: corsHeaders,
          body: JSON.stringify(todo)
        }

      case 'PUT':
        if (pathParameters?.id) {
          const updateData = JSON.parse(body || '{}')
          const todoIndex = todos.findIndex(t => t.id === pathParameters.id)
          if (todoIndex === -1) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ error: 'Todo not found' })
            }
          }
          todos[todoIndex] = { ...todos[todoIndex], ...updateData }
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(todos[todoIndex])
          }
        }
        break

      case 'DELETE':
        if (pathParameters?.id) {
          const todoIndex = todos.findIndex(t => t.id === pathParameters.id)
          if (todoIndex === -1) {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({ error: 'Todo not found' })
            }
          }
          todos.splice(todoIndex, 1)
          return {
            statusCode: 204,
            headers: corsHeaders,
            body: ''
          }
        }
        break

      default:
        return {
          statusCode: 405,
          headers: corsHeaders,
          body: JSON.stringify({ error: 'Method not allowed' })
        }
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }

  return {
    statusCode: 400,
    headers: corsHeaders,
    body: JSON.stringify({ error: 'Bad request' })
  }
}
