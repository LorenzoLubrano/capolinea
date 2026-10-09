import type { SqlDatabase } from './database';
import { runMigrations, type MigrateOptions, type Migration } from './migrations';

/**
 * The database schema, one migration per version. A released migration never changes: a new
 * need is a new migration, with a test that starts from a database at the previous version.
 *
 * Conventions, the same as the domain model
 * - Amounts are integer cents; booleans are 0 and 1; tags and split shares are JSON lists.
 * - Calendar dates are `YYYY-MM-DD` text, checked to be real days; timestamps are ISO UTC text.
 * - Rows are never deleted by the app (soft delete with `deleted_at`), except goal contributions.
 * - References are checked at commit, so a backup can be restored in any order.
 */

const V1 = `
CREATE TABLE meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
) STRICT;

CREATE TABLE people (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  owner_id TEXT,
  name TEXT NOT NULL,
  is_me INTEGER NOT NULL CHECK (is_me IN (0, 1))
) STRICT;
CREATE UNIQUE INDEX people_one_me ON people (is_me) WHERE is_me = 1;

CREATE TABLE accounts (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  owner_id TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bank', 'ewallet', 'cash', 'credit_card', 'savings', 'other')),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  opening_balance_minor INTEGER NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  include_in_total INTEGER NOT NULL CHECK (include_in_total IN (0, 1)),
  archived INTEGER NOT NULL CHECK (archived IN (0, 1)),
  sort_order INTEGER NOT NULL
) STRICT;

CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  owner_id TEXT,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('expense', 'income')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  parent_id TEXT REFERENCES categories (id) DEFERRABLE INITIALLY DEFERRED,
  is_default INTEGER NOT NULL CHECK (is_default IN (0, 1)),
  archived INTEGER NOT NULL CHECK (archived IN (0, 1)),
  sort_order INTEGER NOT NULL
) STRICT;

CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  owner_id TEXT,
  name TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  frequency_unit TEXT NOT NULL CHECK (frequency_unit IN ('week', 'month', 'year')),
  frequency_interval INTEGER NOT NULL CHECK (frequency_interval >= 1),
  anchor_date TEXT NOT NULL CHECK (date(anchor_date) IS anchor_date),
  next_billing_date TEXT NOT NULL CHECK (date(next_billing_date) IS next_billing_date),
  start_date TEXT NOT NULL CHECK (date(start_date) IS start_date),
  end_date TEXT CHECK (date(end_date) IS end_date),
  category_id TEXT NOT NULL REFERENCES categories (id) DEFERRABLE INITIALLY DEFERRED,
  account_id TEXT NOT NULL REFERENCES accounts (id) DEFERRABLE INITIALLY DEFERRED,
  notes TEXT,
  active INTEGER NOT NULL CHECK (active IN (0, 1))
) STRICT;

CREATE TABLE transactions (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  owner_id TEXT,
  type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer', 'refund')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  date TEXT NOT NULL CHECK (date(date) IS date),
  account_id TEXT NOT NULL REFERENCES accounts (id) DEFERRABLE INITIALLY DEFERRED,
  to_account_id TEXT REFERENCES accounts (id) DEFERRABLE INITIALLY DEFERRED,
  category_id TEXT REFERENCES categories (id) DEFERRABLE INITIALLY DEFERRED,
  subcategory_id TEXT REFERENCES categories (id) DEFERRABLE INITIALLY DEFERRED,
  merchant TEXT,
  description TEXT,
  notes TEXT,
  tags TEXT NOT NULL CHECK (json_valid(tags) AND json_type(tags) = 'array'),
  payment_method TEXT CHECK (payment_method IN ('card', 'cash', 'bank_transfer', 'wallet', 'other')),
  receipt_uri TEXT,
  necessity TEXT CHECK (necessity IN ('need', 'want')),
  is_recurring INTEGER NOT NULL CHECK (is_recurring IN (0, 1)),
  subscription_id TEXT REFERENCES subscriptions (id) DEFERRABLE INITIALLY DEFERRED,
  occurrence_date TEXT CHECK (date(occurrence_date) IS occurrence_date),
  edited_after_generation INTEGER CHECK (edited_after_generation IN (0, 1)),
  refund_of_id TEXT REFERENCES transactions (id) DEFERRABLE INITIALLY DEFERRED,
  paid_by_person_id TEXT REFERENCES people (id) DEFERRABLE INITIALLY DEFERRED,
  split TEXT CHECK (json_valid(split) AND json_type(split) = 'array'),
  settlement_with TEXT REFERENCES people (id) DEFERRABLE INITIALLY DEFERRED
) STRICT;
CREATE INDEX transactions_by_date ON transactions (date);
CREATE INDEX transactions_by_account ON transactions (account_id);
CREATE INDEX transactions_by_category ON transactions (category_id);
CREATE INDEX transactions_by_subscription ON transactions (subscription_id);
-- Without it, every movement removed at once (wipe, restore) scans the table for its refunds.
CREATE INDEX transactions_by_refunded ON transactions (refund_of_id);

CREATE TABLE budgets (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  owner_id TEXT,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'category')),
  category_id TEXT REFERENCES categories (id) DEFERRABLE INITIALLY DEFERRED,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  from_month TEXT NOT NULL CHECK (date(from_month || '-01') IS from_month || '-01'),
  CHECK (scope = 'global' OR category_id IS NOT NULL)
) STRICT;

CREATE TABLE goals (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  owner_id TEXT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  target_minor INTEGER NOT NULL CHECK (target_minor >= 0),
  currency TEXT NOT NULL CHECK (length(currency) = 3),
  target_date TEXT CHECK (date(target_date) IS target_date),
  account_id TEXT REFERENCES accounts (id) DEFERRABLE INITIALLY DEFERRED
) STRICT;

CREATE TABLE goal_contributions (
  id TEXT PRIMARY KEY NOT NULL,
  goal_id TEXT NOT NULL REFERENCES goals (id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,
  date TEXT NOT NULL CHECK (date(date) IS date),
  amount_minor INTEGER NOT NULL
) STRICT;
CREATE INDEX goal_contributions_by_goal ON goal_contributions (goal_id);
`;

export const MIGRATIONS: Migration[] = [{ version: 1, up: (db) => db.execAsync(V1) }];

/**
 * Run once per opened connection, before anything else: connection settings, then migrations.
 * Settings go first because SQLite ignores `foreign_keys` inside a transaction.
 */
export async function prepareDatabase(db: SqlDatabase, options: MigrateOptions) {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  return runMigrations(db, MIGRATIONS, options);
}

/** A consistent copy of the whole database in `path`, a file that must not exist yet. */
export async function copyDatabaseTo(db: SqlDatabase, path: string) {
  await db.runAsync('VACUUM INTO ?', [path]);
}
