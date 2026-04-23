import { Pool } from 'pg'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

let pool: Pool | null = null

interface DbSecret {
  username: string
  password: string
  host: string
  port: number
  dbname: string
}

/**
 * Returns a shared connection pool.
 * On first call, reads credentials from Secrets Manager (DB_SECRET_ARN).
 * Reuses the pool across warm Lambda invocations.
 */
export async function getPool(): Promise<Pool> {
  if (pool) return pool

  const secretArn = process.env.DB_SECRET_ARN

  let host: string
  let port: number
  let user: string
  let password: string
  let database: string

  if (secretArn) {
    // Production — read from Secrets Manager
    const sm = new SecretsManagerClient({})
    const res = await sm.send(new GetSecretValueCommand({ SecretId: secretArn }))
    const secret: DbSecret = JSON.parse(res.SecretString ?? '{}')
    host = secret.host ?? process.env.DB_HOST ?? 'localhost'
    port = secret.port ?? Number(process.env.DB_PORT ?? '5432')
    user = secret.username
    password = secret.password
    database = secret.dbname ?? process.env.DB_NAME ?? 'todos'
  } else {
    // Local development fallback
    host = process.env.DB_HOST ?? 'localhost'
    port = Number(process.env.DB_PORT ?? '5432')
    user = process.env.DB_USER ?? 'postgres'
    password = process.env.DB_PASSWORD ?? 'postgres'
    database = process.env.DB_NAME ?? 'todos'
  }

  pool = new Pool({
    host,
    port,
    user,
    password,
    database,
    max: 5,
    idleTimeoutMillis: 60_000,
    connectionTimeoutMillis: 5_000,
    ssl: secretArn ? { rejectUnauthorized: false } : undefined,
  })

  return pool
}
