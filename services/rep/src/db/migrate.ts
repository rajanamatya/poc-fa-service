import path from 'node:path'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { closeDb, getDb } from './client'

/**
 * Runs pending Drizzle migrations against the configured database.
 * Intended for CLI use (npm run db:migrate) and integration tests, not Lambda cold starts.
 */
export async function runMigrations(): Promise<void> {
  const db = await getDb()
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), 'migrations') })
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate.js')) {
  runMigrations()
    .then(() => console.log('Migrations applied'))
    .catch((err) => {
      console.error('Migration failed:', err)
      process.exitCode = 1
    })
    .finally(() => closeDb())
}
