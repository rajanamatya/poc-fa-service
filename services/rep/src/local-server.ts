/**
 * Local HTTP wrapper for the rep handler. Translates plain Node http requests
 * into APIGatewayProxyEventV2 events, calls handler(), and writes the response
 * back. Used only for local development against docker Postgres.
 *
 * Usage:  PORT=3001 tsx src/local-server.ts
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { closeDb } from './db/client'
import { handler } from './handler'

const PORT = Number(process.env.PORT ?? '3001')

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return Buffer.concat(chunks).toString('utf8')
}

function buildEvent(req: IncomingMessage, body: string): APIGatewayProxyEventV2 {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const segments = url.pathname.split('/').filter(Boolean)
  const idLike = segments.length >= 2 ? segments[segments.length - 1] : undefined
  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === 'string') headers[k] = v
    else if (Array.isArray(v)) headers[k] = v.join(',')
  }

  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1),
    headers,
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      domainName: req.headers.host ?? 'localhost',
      domainPrefix: 'local',
      http: {
        method: (req.method ?? 'GET').toUpperCase(),
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: req.socket.remoteAddress ?? '127.0.0.1',
        userAgent: req.headers['user-agent'] ?? '',
      },
      requestId: cryptoRandomId(),
      routeKey: '$default',
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
    pathParameters: idLike ? { id: idLike } : undefined,
    body: body.length ? body : undefined,
    isBase64Encoded: false,
  } as APIGatewayProxyEventV2
}

function cryptoRandomId(): string {
  return Math.random().toString(36).slice(2)
}

function isResultObject(
  res: APIGatewayProxyResultV2,
): res is { statusCode?: number; headers?: Record<string, string>; body?: string } {
  return typeof res === 'object' && res !== null && !Array.isArray(res)
}

async function send(res: ServerResponse, result: APIGatewayProxyResultV2) {
  if (typeof result === 'string') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(result)
    return
  }
  if (!isResultObject(result)) {
    res.writeHead(500)
    res.end()
    return
  }
  const status = result.statusCode ?? 200
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(result.headers ?? {}),
  }
  res.writeHead(status, headers)
  res.end(result.body ?? '')
}

const server = createServer(async (req, res) => {
  try {
    const body = await readBody(req)
    const event = buildEvent(req, body)
    const result = await handler(event)
    await send(res, result)
  } catch (err) {
    console.error('Local server error:', err)
    res.writeHead(500, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
})

server.listen(PORT, () => {
  console.log(`rep handler listening on http://localhost:${PORT}`)
})

const shutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down...`)
  server.close()
  await closeDb()
  process.exit(0)
}
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
