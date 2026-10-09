/// <reference types="node" />
import { DatabaseSync } from 'node:sqlite';

import type { SqlDatabase, SqlValue } from '../database';

/**
 * Test-only: expo-sqlite does not run in Node, so tests drive Node's built-in SQLite through the
 * same interface, with the same transaction behaviour. Never imported by the app.
 */
export function openTestDatabase(location = ':memory:'): SqlDatabase & { close(): void } {
  const db = new DatabaseSync(location);
  return {
    async execAsync(source) {
      db.exec(source);
    },
    async runAsync(source, params: SqlValue[]) {
      const { changes, lastInsertRowid } = db.prepare(source).run(...params);
      return { changes: Number(changes), lastInsertRowId: Number(lastInsertRowid) };
    },
    async getFirstAsync<T>(source: string, params: SqlValue[]) {
      const row = db.prepare(source).get(...params);
      return row ? ({ ...row } as T) : null;
    },
    async getAllAsync<T>(source: string, params: SqlValue[]) {
      return db.prepare(source).all(...params).map((row) => ({ ...row }) as T);
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close: () => db.close(),
  };
}
