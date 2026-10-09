import type { SqlDatabase } from './database';

/**
 * The database file is encrypted with SQLCipher in the installed app (not in Expo Go, which lacks
 * it). The key is 32 random bytes kept in the phone's secure store; it never leaves the phone.
 */

const KEY_PATTERN = /^[0-9a-f]{64}$/;

/**
 * The first statement on a newly opened connection. A raw key (`x'…'`) skips SQLCipher's key
 * derivation, which is only needed for passwords a person types; the pattern keeps it safe to inline.
 */
export function keyStatement(key: string): string {
  if (!KEY_PATTERN.test(key)) throw new Error('The database key is not a 256-bit hex key');
  return `PRAGMA key = "x'${key}'"`;
}

/**
 * The key of the database file, made when the file is created. A key that cannot be read is an
 * error, never «no key»: a new key for an existing file would make its data unreadable for good.
 */
export function databaseKey(
  store: { get(): string | null; set(key: string): void },
  databaseExists: boolean,
  randomBytes: (count: number) => Uint8Array,
): string {
  const saved = store.get();
  if (saved) return saved;
  if (databaseExists) throw new Error('The database exists but its key is missing');
  const key = newDatabaseKey(randomBytes);
  store.set(key);
  return key;
}

export function newDatabaseKey(randomBytes: (count: number) => Uint8Array): string {
  return Array.from(randomBytes(32), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * An encrypted copy of the encrypted database, with the same key, in `path` (a file that must not
 * exist yet): SQLCipher's documented way. Its docs say nothing of what VACUUM INTO writes.
 */
export async function copyEncryptedDatabaseTo(db: SqlDatabase, path: string, key: string) {
  keyStatement(key);
  await db.runAsync(`ATTACH DATABASE ? AS backup_copy KEY "x'${key}'"`, [path]);
  try {
    await db.getFirstAsync("SELECT sqlcipher_export('backup_copy')", []);
  } finally {
    await db.execAsync('DETACH DATABASE backup_copy');
  }
}

const PLAIN_HEADER = 'SQLite format 3\0';

/** A plain SQLite file starts with this header; an encrypted one starts with random bytes. */
export function isPlainDatabase(header: Uint8Array): boolean {
  if (header.length < PLAIN_HEADER.length) return false;
  return Array.from(PLAIN_HEADER).every((char, i) => header[i] === char.charCodeAt(0));
}
