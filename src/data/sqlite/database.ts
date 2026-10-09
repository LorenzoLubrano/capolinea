/** A value the data layer binds: booleans are written as 0 and 1 by the caller, so both drivers agree. */
export type SqlValue = string | number | null;

/**
 * The part of expo-sqlite's `SQLiteDatabase` the data layer uses. Keeping to it lets the same SQL
 * run in Jest on Node's own SQLite (`testing/node-database.ts`).
 */
export interface SqlDatabase {
  /** Several statements, no parameters: schema only, never user data. */
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params: SqlValue[]): Promise<{ changes: number; lastInsertRowId: number }>;
  getFirstAsync<T>(source: string, params: SqlValue[]): Promise<T | null>;
  getAllAsync<T>(source: string, params: SqlValue[]): Promise<T[]>;
  /** BEGIN, the task, COMMIT; ROLLBACK and rethrow when the task or the commit fails. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
