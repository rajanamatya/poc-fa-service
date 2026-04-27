import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool, type PoolConfig } from 'pg'
import * as schema from './schema'

export type Db = NodePgDatabase<typeof schema>

interface DbSecret {
  username: string
  password: string
  host: string
  port: number
  dbname: string
}

let cached: { pool: Pool; db: Db } | null = null

async function loadConfig(): Promise<PoolConfig> {
  const secretArn = process.env.DB_SECRET_ARN

  if (!secretArn) {
    return {
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? '5432'),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'todos',
    }
  }

  const sm = new SecretsManagerClient({})
  const res = await sm.send(new GetSecretValueCommand({ SecretId: secretArn }))
  const secret: DbSecret = JSON.parse(res.SecretString ?? '{}')

  return {
    host: secret.host ?? process.env.DB_HOST ?? 'localhost',
    port: secret.port ?? Number(process.env.DB_PORT ?? '5432'),
    user: secret.username,
    password: secret.password,
    database: secret.dbname ?? process.env.DB_NAME ?? 'todos',
    ssl: { rejectUnauthorized: false },
  }
}

/**
 * Returns a Drizzle client backed by a shared pg Pool.
 * Cached across warm Lambda invocations.
 */
export async function getDb(): Promise<Db> {
  if (cached) return cached.db

  const pool = new Pool({
    ...(await loadConfig()),
    max: 5,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 5_000,
  })
  const db = drizzle(pool, { schema })

  cached = { pool, db }
  return db
}

/** Test/script helper: closes the pool and clears the cached client. */
export async function closeDb(): Promise<void> {
  if (!cached) return
  await cached.pool.end()
  cached = null
}

export { schema }
