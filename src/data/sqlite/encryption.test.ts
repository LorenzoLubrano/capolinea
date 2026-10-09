import { databaseKey, isPlainDatabase, keyStatement, newDatabaseKey } from './encryption';

const KEY = '2dd29ca851e7b56e4697b0e1f08507293d761a05ce4d1b628663f411a8086d99';
const random = (count: number) => new Uint8Array(count).fill(1);

function keyStore(saved: string | null | Error) {
  const writes: string[] = [];
  return {
    writes,
    get: () => {
      if (saved instanceof Error) throw saved;
      return saved;
    },
    set: (key: string) => void writes.push(key),
  };
}

describe('databaseKey', () => {
  it('uses the saved key', () => {
    const store = keyStore(KEY);

    expect(databaseKey(store, true, random)).toBe(KEY);
    expect(store.writes).toEqual([]);
  });

  it('makes and saves a key for a database not created yet', () => {
    const store = keyStore(null);

    const key = databaseKey(store, false, random);

    expect(key).toBe('01'.repeat(32));
    expect(store.writes).toEqual([key]);
  });

  it('never replaces the key of an existing database: a new one would lose the data', () => {
    const store = keyStore(null);

    expect(() => databaseKey(store, true, random)).toThrow();
    expect(store.writes).toEqual([]);
  });

  it('fails, without writing, when the saved key cannot be read', () => {
    const store = keyStore(new Error('keystore'));

    expect(() => databaseKey(store, false, random)).toThrow('keystore');
    expect(store.writes).toEqual([]);
  });
});

describe('database encryption', () => {
  it('gives SQLCipher the key as raw bytes, so opening skips the slow key derivation', () => {
    expect(keyStatement(KEY)).toBe(`PRAGMA key = "x'${KEY}'"`);
  });

  it('refuses anything but a 256-bit key in hex, which also keeps the statement safe', () => {
    expect(() => keyStatement('short')).toThrow();
    expect(() => keyStatement(`${KEY.slice(0, 62)}'"`)).toThrow();
  });

  it('makes a new key from 32 random bytes', () => {
    const key = newDatabaseKey((count) => Uint8Array.from({ length: count }, (_, i) => i * 7));

    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key.slice(0, 6)).toBe('00070e');
  });

  it('tells a plain SQLite file from an encrypted one by its first bytes', () => {
    const plain = new TextEncoder().encode('SQLite format 3\0 and then pages');
    const encrypted = Uint8Array.from({ length: 32 }, (_, i) => (i * 37 + 11) % 256);

    expect(isPlainDatabase(plain)).toBe(true);
    expect(isPlainDatabase(encrypted)).toBe(false);
    expect(isPlainDatabase(new Uint8Array(0))).toBe(false);
  });
});
