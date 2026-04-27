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

/**
 * Resolves Postgres connection settings.
 * Production: AWS Secrets Manager (DB_SECRET_ARN). Local: process.env.
 */
async function resolveConnection(): Promise<PoolConfig> {
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

const POOL_DEFAULTS = {
  max: 5,
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 5_000,
} as const

/**
 * Lazily initialised, process-scoped database handle.
 *
 * `Database.connect()` returns the shared instance, creating it on first call
 * and reusing it across warm Lambda invocations. The pool is exposed for raw
 * SQL needs (migrator, scripts); everyday code should use `db`.
 */
export class Database {
  private static pending: Promise<Database> | null = null

  private constructor(
    public readonly pool: Pool,
    public readonly db: Db,
  ) {}

  static connect(): Promise<Database> {
    return (this.pending ??= this.create())
  }

  private static async create(): Promise<Database> {
    const pool = new Pool({ ...(await resolveConnection()), ...POOL_DEFAULTS })
    return new Database(pool, drizzle(pool, { schema }))
  }

  async close(): Promise<void> {
    await this.pool.end()
    Database.pending = null
  }
}

export const getDb = async (): Promise<Db> => (await Database.connect()).db

export async function closeDb(): Promise<void> {
  if (!Database['pending']) return
  await (await Database.connect()).close()
}

export { schema }
