import { describe, it, expect } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { handler } from '../src/handler.js'

describe('handler', () => {
  it('returns ok payload', async () => {
    const res = await handler({} as APIGatewayProxyEventV2)
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.body as string)).toMatchObject({ status: 'ok' })
  })
})
