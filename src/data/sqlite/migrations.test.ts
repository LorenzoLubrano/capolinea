import type { SqlDatabase } from './database';
import { DatabaseVersionError, runMigrations, type Migration } from './migrations';
import { openTestDatabase } from './testing/node-database';

const createTable = (version: number, table: string): Migration => ({
  version,
  up: (db) => db.execAsync(`CREATE TABLE ${table} (id INTEGER PRIMARY KEY)`),
});
const MIGRATIONS = [createTable(1, 'first'), createTable(2, 'second'), createTable(3, 'third')];

async function versionOf(db: SqlDatabase) {
  return (await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []))!.user_version;
}

async function tablesOf(db: SqlDatabase) {
  const rows = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", []);
  return rows.map((row) => row.name);
}

/** A database left by an older app: only the first migration ran. */
async function databaseAtVersion1() {
  const db = openTestDatabase();
  await runMigrations(db, MIGRATIONS.slice(0, 1), { backup: jest.fn() });
  return db;
}

describe('runMigrations', () => {
  it('brings a new database to the latest version without copying it', async () => {
    const db = openTestDatabase();
    const backup = jest.fn();

    await expect(runMigrations(db, MIGRATIONS, { backup })).resolves.toEqual({ from: 0, to: 3 });

    expect(await versionOf(db)).toBe(3);
    expect(await tablesOf(db)).toEqual(['first', 'second', 'third']);
    expect(backup).not.toHaveBeenCalled();
  });

  it('copies an existing database once, before the first change', async () => {
    const db = await databaseAtVersion1();
    const seen: unknown[] = [];
    const backup = jest.fn(async (from: number) => {
      seen.push(from, await versionOf(db), await tablesOf(db));
    });

    await expect(runMigrations(db, MIGRATIONS, { backup })).resolves.toEqual({ from: 1, to: 3 });

    expect(backup).toHaveBeenCalledTimes(1);
    expect(seen).toEqual([1, 1, ['first']]);
    expect(await tablesOf(db)).toEqual(['first', 'second', 'third']);
  });

  it('does nothing on a database already up to date', async () => {
    const db = openTestDatabase();
    await runMigrations(db, MIGRATIONS, { backup: jest.fn() });
    const backup = jest.fn();

    await expect(runMigrations(db, MIGRATIONS, { backup })).resolves.toEqual({ from: 3, to: 3 });

    expect(backup).not.toHaveBeenCalled();
  });

  it('leaves the database as it was when a migration fails', async () => {
    const db = await databaseAtVersion1();
    const broken: Migration = { version: 3, up: (tx) => tx.execAsync('CREATE TABLE third (') };

    await expect(runMigrations(db, [MIGRATIONS[0], MIGRATIONS[1], broken], { backup: jest.fn() })).rejects.toThrow();

    expect(await versionOf(db)).toBe(1);
    expect(await tablesOf(db)).toEqual(['first']);
  });

  it('changes nothing when the copy fails', async () => {
    const db = await databaseAtVersion1();
    const backup = jest.fn().mockRejectedValue(new Error('disk full'));

    await expect(runMigrations(db, MIGRATIONS, { backup })).rejects.toThrow('disk full');

    expect(await versionOf(db)).toBe(1);
    expect(await tablesOf(db)).toEqual(['first']);
  });

  it('refuses a database written by a newer version of the app', async () => {
    const db = openTestDatabase();
    await runMigrations(db, MIGRATIONS, { backup: jest.fn() });

    await expect(runMigrations(db, MIGRATIONS.slice(0, 2), { backup: jest.fn() })).rejects.toBeInstanceOf(DatabaseVersionError);

    expect(await versionOf(db)).toBe(3);
  });

  it('rejects a list of migrations with a gap', async () => {
    const db = openTestDatabase();

    await expect(runMigrations(db, [MIGRATIONS[0], MIGRATIONS[2]], { backup: jest.fn() })).rejects.toThrow('Migration 2 is missing');

    expect(await versionOf(db)).toBe(0);
  });
});
