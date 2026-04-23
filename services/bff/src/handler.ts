import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

/**
 * BFF (Backend For Frontend) Lambda handler.
 *
 * Sits between the Vue 3 frontend and the backend service.
 * - Receives requests from the frontend via the BFF API Gateway
 * - Forwards them to the backend API Gateway (BACKEND_API_URL env var)
 * - Can add auth headers, transform payloads, aggregate calls, etc.
 *
 * Uses native fetch (Node 22+) — no external HTTP dependencies needed.
 */

const BACKEND_API_URL = process.env.BACKEND_API_URL ?? ''

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const method = event.requestContext.http.method
  const path = event.rawPath || '/'
  const queryString = event.rawQueryString ? `?${event.rawQueryString}` : ''

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: '',
    }
  }

  if (!BACKEND_API_URL) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'BACKEND_API_URL is not configured' }),
    }
  }

  try {
    const targetUrl = `${BACKEND_API_URL}${path}${queryString}`

    const fetchOptions: RequestInit = {
      method,
      headers: forwardHeaders(event),
    }

    // Only attach body for methods that support it
    if (event.body && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = event.body
    }

    const backendResponse = await fetch(targetUrl, fetchOptions)
    const responseBody = await backendResponse.text()

    return {
      statusCode: backendResponse.status,
      headers: {
        ...corsHeaders(),
        'content-type': backendResponse.headers.get('content-type') ?? 'application/json',
      },
      body: responseBody,
    }
  } catch (error) {
    console.error('BFF proxy error:', error)
    return {
      statusCode: 502,
      headers: corsHeaders(),
      body: JSON.stringify({ error: 'Bad gateway — backend service unreachable' }),
    }
  }
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }
}

/** Forward safe headers from the incoming request to the backend. */
function forwardHeaders(event: APIGatewayProxyEventV2): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  }

  const auth = event.headers?.['authorization'] ?? event.headers?.['Authorization']
  if (auth) {
    headers['authorization'] = auth
  }

  return headers
}
