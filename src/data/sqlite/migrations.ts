import type { SqlDatabase } from './database';

/** One step of the schema. Version N turns a database at version N - 1 into version N. */
export interface Migration {
  version: number;
  /** Runs inside the migration transaction: it never commits and never changes `foreign_keys`. */
  up(db: SqlDatabase): Promise<void>;
}

export interface MigrateOptions {
  /** Copies the database before its first change. Not called for a new, empty database. */
  backup(fromVersion: number): Promise<void>;
}

/** The database was written by a newer app: opening it with this one could lose data. */
export class DatabaseVersionError extends Error {
  constructor(
    readonly found: number,
    readonly supported: number,
  ) {
    super(`Database version ${found} is newer than the supported ${supported}`);
    this.name = 'DatabaseVersionError';
  }
}

/**
 * Brings the database to the last migration. The version lives in `PRAGMA user_version`; the
 * pending migrations run in one transaction, so the database is either fully migrated or as it was.
 */
export async function runMigrations(db: SqlDatabase, migrations: Migration[], { backup }: MigrateOptions): Promise<{ from: number; to: number }> {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) throw new Error(`Migration ${index + 1} is missing`);
  });
  const latest = migrations.length;
  const from = (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))?.user_version ?? 0;
  if (from > latest) throw new DatabaseVersionError(from, latest);
  if (from === latest) return { from, to: latest };

  if (from > 0) await backup(from);
  await db.withTransactionAsync(async () => {
    for (const migration of migrations.slice(from)) await migration.up(db);
    // A number from the code, never user input: PRAGMA takes no bound parameters.
    await db.execAsync(`PRAGMA user_version = ${latest}`);
  });
  return { from, to: latest };
}
