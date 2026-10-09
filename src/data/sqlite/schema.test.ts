/// <reference types="node" />
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { SqlDatabase, SqlValue } from './database';
import { copyDatabaseTo, MIGRATIONS, prepareDatabase } from './schema';
import { openTestDatabase } from './testing/node-database';

type Row = Record<string, SqlValue>;

const META = { created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-01T08:00:00Z', deleted_at: null, owner_id: null };

/** One row per table with every column written out, optional ones included. */
const ROWS: Record<string, Row[]> = {
  meta: [{ key: 'currency', value: 'EUR' }],
  people: [
    { id: 'person-me', ...META, name: 'Lorenzo', is_me: 1 },
    { id: 'person-giulia', ...META, deleted_at: '2026-10-02T08:00:00Z', owner_id: 'owner-1', name: 'Giulia', is_me: 0 },
  ],
  accounts: [
    { id: 'acc-cash', ...META, name: 'Contanti', type: 'cash', currency: 'EUR', opening_balance_minor: 0, color: 'green', icon: null, include_in_total: 1, archived: 0, sort_order: 0 },
    { id: 'acc-bank', ...META, name: 'Banca', type: 'bank', currency: 'EUR', opening_balance_minor: -2500, color: 'blue', icon: 'Bank', include_in_total: 0, archived: 1, sort_order: 1 },
  ],
  categories: [
    { id: 'cat-groceries', ...META, name: 'Spesa alimentare', kind: 'expense', icon: 'ShoppingCart', color: 'green', parent_id: null, is_default: 1, archived: 0, sort_order: 0 },
    { id: 'cat-market', ...META, name: 'Mercato', kind: 'expense', icon: 'Basket', color: 'green', parent_id: 'cat-groceries', is_default: 0, archived: 0, sort_order: 1 },
  ],
  subscriptions: [
    {
      id: 'sub-spotify', ...META, name: 'Spotify', amount_minor: 1099, currency: 'EUR', frequency_unit: 'month', frequency_interval: 1,
      anchor_date: '2026-01-31', next_billing_date: '2026-10-31', start_date: '2026-01-31', end_date: '2027-01-31',
      category_id: 'cat-groceries', account_id: 'acc-bank', notes: 'Famiglia', active: 1,
    },
  ],
  transactions: [
    {
      id: 'tx-dinner', ...META, type: 'expense', amount_minor: 4800, currency: 'EUR', date: '2026-10-09', account_id: 'acc-cash',
      to_account_id: null, category_id: 'cat-groceries', subcategory_id: 'cat-market', merchant: 'Esselunga', description: 'Cena',
      notes: 'Con Giulia', tags: '["casa"]', payment_method: 'card', receipt_uri: 'file:///scontrino.jpg', necessity: 'need',
      is_recurring: 1, subscription_id: 'sub-spotify', occurrence_date: '2026-09-30', edited_after_generation: 1, refund_of_id: null,
      paid_by_person_id: 'person-giulia', split: '[{"personId":"person-giulia","amountMinor":2400,"settled":false}]', settlement_with: null,
    },
    {
      id: 'tx-refund', ...META, type: 'refund', amount_minor: 800, currency: 'EUR', date: '2026-10-10', account_id: 'acc-cash',
      to_account_id: 'acc-bank', category_id: null, subcategory_id: null, merchant: null, description: null, notes: null, tags: '[]',
      payment_method: null, receipt_uri: null, necessity: null, is_recurring: 0, subscription_id: null, occurrence_date: null,
      edited_after_generation: null, refund_of_id: 'tx-dinner', paid_by_person_id: null, split: null, settlement_with: 'person-giulia',
    },
  ],
  budgets: [
    { id: 'budget-month', ...META, scope: 'global', category_id: null, amount_minor: 80000, currency: 'EUR', from_month: '2026-08' },
    { id: 'budget-food', ...META, scope: 'category', category_id: 'cat-groceries', amount_minor: 30000, currency: 'EUR', from_month: '2026-09' },
  ],
  goals: [
    { id: 'goal-trip', ...META, name: 'Viaggio', icon: 'AirplaneTilt', color: 'olive', target_minor: 150000, currency: 'EUR', target_date: '2027-06-30', account_id: 'acc-bank' },
  ],
  goal_contributions: [{ id: 'contribution-1', goal_id: 'goal-trip', date: '2026-09-01', amount_minor: 10000 }],
};

async function insert(db: SqlDatabase, table: string, row: Row) {
  const columns = Object.keys(row);
  await db.runAsync(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`, Object.values(row));
}

async function insertAll(db: SqlDatabase) {
  for (const [table, rows] of Object.entries(ROWS)) for (const row of rows) await insert(db, table, row);
}

async function newDatabase(location?: string) {
  const db = openTestDatabase(location);
  await prepareDatabase(db, { backup: jest.fn() });
  return db;
}

const BROKEN = /CHECK constraint failed|UNIQUE constraint failed|cannot store REAL value in INTEGER column/;

describe('schema', () => {
  it('creates every table on a new database and turns foreign keys on', async () => {
    const db = await newDatabase();

    const tables = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name", []);
    expect(tables.map((t) => t.name)).toEqual(Object.keys(ROWS).sort());
    expect(await db.getFirstAsync('PRAGMA user_version', [])).toEqual({ user_version: MIGRATIONS.length });
    expect(await db.getFirstAsync('PRAGMA foreign_keys', [])).toEqual({ foreign_keys: 1 });
  });

  it('keeps every column of every table', async () => {
    const db = await newDatabase();

    await db.withTransactionAsync(() => insertAll(db));

    for (const [table, rows] of Object.entries(ROWS)) {
      expect(await db.getAllAsync(`SELECT * FROM ${table} ORDER BY rowid`, [])).toEqual(rows);
    }
  });

  const movement = ROWS.transactions[1];
  it.each<[string, string, Row]>([
    ['fractional cents', 'transactions', { ...movement, id: 'bad', amount_minor: 12.5 }],
    ['a negative amount', 'transactions', { ...movement, id: 'bad', amount_minor: -1 }],
    ['an unknown movement type', 'transactions', { ...movement, id: 'bad', type: 'gift' }],
    ['a day that does not exist', 'transactions', { ...movement, id: 'bad', date: '2026-02-30' }],
    ['a date in another format', 'transactions', { ...movement, id: 'bad', date: '09/10/2026' }],
    ['tags that are not a list', 'transactions', { ...movement, id: 'bad', tags: '"casa"' }],
    ['a flag other than 0 and 1', 'transactions', { ...movement, id: 'bad', is_recurring: 2 }],
    ['a category budget without its category', 'budgets', { ...ROWS.budgets[1], id: 'bad', category_id: null }],
    ['a month in another format', 'budgets', { ...ROWS.budgets[0], id: 'bad', from_month: '2026-8' }],
    ['a second «me»', 'people', { ...ROWS.people[0], id: 'bad' }],
    ['a subscription every 0 months', 'subscriptions', { ...ROWS.subscriptions[0], id: 'bad', frequency_interval: 0 }],
  ])('refuses %s', async (_case, table, row) => {
    const db = await newDatabase();
    await db.withTransactionAsync(() => insertAll(db));

    await expect(insert(db, table, row)).rejects.toThrow(BROKEN);
  });

  it('accepts movements that point at records a backup leaves out', async () => {
    const db = await newDatabase();

    // The charge of a deleted subscription, the refund of a deleted expense: kept, their records are not.
    await insert(db, 'transactions', { ...ROWS.transactions[1], subscription_id: 'sub-deleted', refund_of_id: 'tx-deleted', account_id: 'acc-deleted' });

    expect(await db.getFirstAsync('SELECT count(*) AS n FROM transactions', [])).toEqual({ n: 1 });
  });

  it('refuses a contribution to a goal that does not exist, at commit', async () => {
    const db = await newDatabase();

    await expect(
      db.withTransactionAsync(async () => {
        await insert(db, 'goal_contributions', { ...ROWS.goal_contributions[0], goal_id: 'goal-ghost' });
      }),
    ).rejects.toThrow('FOREIGN KEY constraint failed');

    expect(await db.getFirstAsync('SELECT count(*) AS n FROM goal_contributions', [])).toEqual({ n: 0 });
  });

  it('drops the contributions of a goal removed with them', async () => {
    const db = await newDatabase();
    await db.withTransactionAsync(() => insertAll(db));

    await db.runAsync("DELETE FROM goals WHERE id = 'goal-trip'", []);

    expect(await db.getFirstAsync('SELECT count(*) AS n FROM goal_contributions', [])).toEqual({ n: 0 });
  });
});

describe('copyDatabaseTo', () => {
  it('writes the whole database, version included, to a new file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'capolinea-'));
    try {
      const db = await newDatabase();
      await db.withTransactionAsync(() => insertAll(db));
      const target = join(dir, 'copia.db');

      await copyDatabaseTo(db, target);

      const copy = openTestDatabase(target);
      expect(await copy.getFirstAsync('PRAGMA user_version', [])).toEqual({ user_version: MIGRATIONS.length });
      expect(await copy.getAllAsync('SELECT * FROM transactions ORDER BY rowid', [])).toEqual(ROWS.transactions);
      copy.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
