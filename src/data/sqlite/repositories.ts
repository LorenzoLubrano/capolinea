import { addDays, toLocalDate } from '@/domain/dates';
import { settlementPlan } from '@/domain/splits';
import { generateDueCharges, occurrenceAfter } from '@/domain/subscriptions';
import type { Goal, GoalContribution, Id, LocalDate, Person, RecordMeta, Subscription, Transaction } from '@/domain/types';

import { createEmptyDataset } from '../defaults';
import type { Repositories, SettleRecord, Snapshot } from '../repositories';
import type { SqlDatabase } from './database';
import type { MigrateOptions } from './migrations';
import * as rows from './rows';
import type { DbRow } from './rows';
import { prepareDatabase } from './schema';

export interface SqliteOptions {
  /** Today on the phone's clock. Restored data never moves it. */
  today: () => LocalDate;
  /** A new unique id for a record created here. */
  newId: () => Id;
}

type Table = 'people' | 'accounts' | 'categories' | 'subscriptions' | 'transactions' | 'budgets' | 'goals' | 'goal_contributions';

/** Children first, so the list reads as the order to empty the database in. */
const TABLES: (Table | 'meta')[] = ['goal_contributions', 'goals', 'budgets', 'transactions', 'subscriptions', 'categories', 'accounts', 'people', 'meta'];

/** Writes a whole record: inserts it, or replaces the row with its id (and keeps its place). */
async function upsert(db: SqlDatabase, table: Table, row: DbRow) {
  const columns = Object.keys(row);
  const updates = columns.filter((column) => column !== 'id').map((column) => `${column} = excluded.${column}`);
  await db.runAsync(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}`,
    Object.values(row),
  );
}

/** Adds every record of `data`; the database must not hold any of them yet. */
async function insertAll(db: SqlDatabase, data: Snapshot) {
  await db.runAsync("INSERT INTO meta (key, value) VALUES ('currency', ?)", [data.currency]);
  for (const person of data.people) await upsert(db, 'people', rows.personRow(person));
  for (const account of data.accounts) await upsert(db, 'accounts', rows.accountRow(account));
  for (const category of data.categories) await upsert(db, 'categories', rows.categoryRow(category));
  for (const subscription of data.subscriptions) await upsert(db, 'subscriptions', rows.subscriptionRow(subscription));
  for (const tx of data.transactions) await upsert(db, 'transactions', rows.transactionRow(tx));
  for (const budget of data.budgets) await upsert(db, 'budgets', rows.budgetRow(budget));
  for (const goal of data.goals) {
    await upsert(db, 'goals', rows.goalRow(goal));
    for (const contribution of goal.contributions) await upsert(db, 'goal_contributions', rows.contributionRow(goal.id, contribution));
  }
}

/**
 * Prepares the database for the app: connection settings, migrations and, on a new database, the
 * user and the default categories. Run once per opened connection, before any other query.
 */
export async function initialiseDatabase(db: SqlDatabase, options: MigrateOptions) {
  await prepareDatabase(db, options);
  // Only a database without anyone is new: the app never removes the user.
  const people = await db.getFirstAsync<{ n: number }>('SELECT count(*) AS n FROM people', []);
  if (people?.n === 0) await db.withTransactionAsync(() => insertAll(db, createEmptyDataset(toLocalDate(new Date()))));
}

/** The repositories on the phone's database. Calls run one at a time, in the order they arrive. */
export function createSqliteRepositories(db: SqlDatabase, { today, newId }: SqliteOptions): Repositories {
  const now = () => new Date().toISOString();

  const live = async <T>(table: Table, read: (row: DbRow) => T) =>
    (await db.getAllAsync<DbRow>(`SELECT * FROM ${table} WHERE deleted_at IS NULL ORDER BY rowid`, [])).map(read);
  const find = async <T>(table: Table, id: Id, read: (row: DbRow) => T) => {
    const row = await db.getFirstAsync<DbRow>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return row ? read(row) : undefined;
  };
  const chargesOf = async (subscriptionId: Id) =>
    (await db.getAllAsync<DbRow>('SELECT * FROM transactions WHERE subscription_id = ? ORDER BY rowid', [subscriptionId])).map(rows.readTransaction);
  const contributionsOf = async (goalId: Id) =>
    (await db.getAllAsync<DbRow>('SELECT * FROM goal_contributions WHERE goal_id = ? ORDER BY rowid', [goalId])).map(rows.readContribution);
  const loadGoal = async (id: Id) => {
    const row = await db.getFirstAsync<DbRow>('SELECT * FROM goals WHERE id = ?', [id]);
    if (!row) throw new Error('Goal not found: ' + id);
    return rows.readGoal(row, await contributionsOf(id));
  };
  const touchGoal = (id: Id) => db.runAsync('UPDATE goals SET updated_at = ? WHERE id = ?', [now(), id]);
  /** Soft delete or restore in any table, so undo and future sync both work. */
  const setDeleted = async (table: Table, id: Id, deleted: boolean) => {
    const stamp = now();
    await db.runAsync(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`, [deleted ? stamp : null, stamp, id]);
  };
  const setSplit = (id: Id, split: Transaction['split'], stamp: string) =>
    db.runAsync('UPDATE transactions SET split = ?, updated_at = ? WHERE id = ?', [JSON.stringify(split), stamp, id]);
  const currency = async () => {
    const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM meta WHERE key = 'currency'", []);
    if (!row) throw new Error('The database has no currency');
    return row.value;
  };
  const meId = async () => {
    const row = await db.getFirstAsync<{ id: string }>('SELECT id FROM people WHERE is_me = 1', []);
    if (!row) throw new Error('The database has no user');
    return row.id;
  };
  /** Create (no `id`) or update a record, keeping its identity and creation time. */
  const save = async <T extends RecordMeta>(
    table: Table,
    draft: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: Id },
    read: (row: DbRow) => T,
    toRow: (record: T) => DbRow,
  ): Promise<T> => {
    const stamp = now();
    const existing = draft.id ? await find(table, draft.id, read) : undefined;
    const saved = (existing
      ? { ...existing, ...draft, id: existing.id, updatedAt: stamp }
      : { ...draft, id: newId(), createdAt: stamp, updatedAt: stamp }) as T;
    await upsert(db, table, toRow(saved));
    return saved;
  };
  /** Writes a subscription with the charges the generator created, together. */
  const recordGenerated = async (edited: Subscription, existing: Transaction[], stamp: string) => {
    const { charges, subscriptions } = generateDueCharges([edited], existing, today(), { makeId: newId, now: stamp });
    const [subscription] = subscriptions;
    await db.withTransactionAsync(async () => {
      await upsert(db, 'subscriptions', rows.subscriptionRow(subscription));
      for (const charge of charges) await upsert(db, 'transactions', rows.transactionRow(charge));
    });
    return { subscription, generated: charges.length };
  };

  const repos: Repositories = {
    async snapshot(): Promise<Snapshot> {
      const contributions = new Map<Id, GoalContribution[]>();
      for (const row of await db.getAllAsync<DbRow>('SELECT * FROM goal_contributions ORDER BY rowid', [])) {
        const goalId = row.goal_id as Id;
        contributions.set(goalId, [...(contributions.get(goalId) ?? []), rows.readContribution(row)]);
      }
      return {
        today: today(),
        currency: await currency(),
        meId: await meId(),
        people: await live('people', rows.readPerson),
        accounts: await live('accounts', rows.readAccount),
        categories: await live('categories', rows.readCategory),
        subscriptions: await live('subscriptions', rows.readSubscription),
        budgets: await live('budgets', rows.readBudget),
        goals: await live('goals', (row) => rows.readGoal(row, contributions.get(row.id as Id) ?? [])),
        transactions: await live('transactions', rows.readTransaction),
      };
    },

    async addTransaction(draft) {
      const stamp = now();
      const tx: Transaction = { ...draft, id: newId(), createdAt: stamp, updatedAt: stamp };
      await upsert(db, 'transactions', rows.transactionRow(tx));
      return tx;
    },

    async updateTransaction(id, changes) {
      const current = await find('transactions', id, rows.readTransaction);
      if (!current) throw new Error(`Transaction ${id} not found`);
      const next: Record<string, unknown> = { ...current, ...changes, updatedAt: now() };
      for (const [key, value] of Object.entries(changes)) if (value === undefined) delete next[key];
      if (current.subscriptionId) next.editedAfterGeneration = true;
      const updated = next as unknown as Transaction;
      await upsert(db, 'transactions', rows.transactionRow(updated));
      return updated;
    },

    deleteTransaction: (id) => setDeleted('transactions', id, true),
    restoreTransaction: (id) => setDeleted('transactions', id, false),

    async addSubscription(draft) {
      const stamp = now();
      const created: Subscription = {
        ...draft,
        id: newId(),
        createdAt: stamp,
        updatedAt: stamp,
        startDate: draft.anchorDate,
        nextBillingDate: draft.anchorDate,
      };
      return recordGenerated(created, [], stamp);
    },

    async updateSubscription(id, changes) {
      const current = await find('subscriptions', id, rows.readSubscription);
      if (!current) throw new Error('Subscription not found: ' + id);
      const stamp = now();
      // Resuming skips the paused period: the next charge is the first billing date from today.
      const resumed = changes.active === true && !current.active;
      const edited: Subscription = {
        ...current,
        ...changes,
        ...(changes.anchorDate ? { nextBillingDate: changes.anchorDate } : {}),
        updatedAt: stamp,
      };
      if (resumed && !changes.anchorDate && edited.nextBillingDate < today()) {
        edited.nextBillingDate = occurrenceAfter(edited.anchorDate, edited.frequency, addDays(today(), -1));
      }
      return recordGenerated(edited, await chargesOf(id), stamp);
    },

    deleteSubscription: (id) => setDeleted('subscriptions', id, true),
    restoreSubscription: (id) => setDeleted('subscriptions', id, false),

    async addPerson(name) {
      const stamp = now();
      const person: Person = { id: newId(), createdAt: stamp, updatedAt: stamp, name, isMe: false };
      await upsert(db, 'people', rows.personRow(person));
      return person;
    },

    saveBudget: (draft) => save('budgets', draft, rows.readBudget, rows.budgetRow),
    deleteBudget: (id) => setDeleted('budgets', id, true),
    restoreBudget: (id) => setDeleted('budgets', id, false),

    async saveGoal(draft) {
      const stamp = now();
      const { id, ...fields } = draft;
      if (id) {
        await upsert(db, 'goals', rows.goalRow({ ...(await loadGoal(id)), ...fields, updatedAt: stamp }));
        return loadGoal(id);
      }
      const goal: Goal = { ...fields, id: newId(), createdAt: stamp, updatedAt: stamp, contributions: [] };
      await upsert(db, 'goals', rows.goalRow(goal));
      return goal;
    },

    deleteGoal: (id) => setDeleted('goals', id, true),
    restoreGoal: (id) => setDeleted('goals', id, false),

    async addContribution(goalId, contribution) {
      await loadGoal(goalId);
      await db.withTransactionAsync(async () => {
        await upsert(db, 'goal_contributions', rows.contributionRow(goalId, { ...contribution, id: newId() }));
        await touchGoal(goalId);
      });
      return loadGoal(goalId);
    },

    async removeContribution(goalId, contributionId) {
      await loadGoal(goalId);
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM goal_contributions WHERE id = ? AND goal_id = ?', [contributionId, goalId]);
        await touchGoal(goalId);
      });
      return loadGoal(goalId);
    },

    saveAccount: (draft) => save('accounts', draft, rows.readAccount, rows.accountRow),
    deleteAccount: (id) => setDeleted('accounts', id, true),
    restoreAccount: (id) => setDeleted('accounts', id, false),

    saveCategory: (draft) => save('categories', draft, rows.readCategory, rows.categoryRow),
    deleteCategory: (id) => setDeleted('categories', id, true),
    restoreCategory: (id) => setDeleted('categories', id, false),

    async updatePerson(id, name) {
      const current = await find('people', id, rows.readPerson);
      if (!current) throw new Error('Person not found: ' + id);
      const person = { ...current, name, updatedAt: now() };
      await upsert(db, 'people', rows.personRow(person));
      return person;
    },

    deletePerson: (id) => setDeleted('people', id, true),
    restorePerson: (id) => setDeleted('people', id, false),

    async settleWith(personId, { date, accountId, description }): Promise<SettleRecord> {
      const shared = (await db.getAllAsync<DbRow>('SELECT * FROM transactions WHERE split IS NOT NULL ORDER BY rowid', [])).map(rows.readTransaction);
      const plan = settlementPlan(shared, await meId(), personId, date);
      const changed = new Set(plan.changes.map((change) => change.id));
      const previous = shared.filter((t) => changed.has(t.id)).map((t) => ({ id: t.id, split: t.split! }));
      let transactionId: Id | undefined;
      const payCurrency = await currency();
      await db.withTransactionAsync(async () => {
        const stamp = now();
        for (const change of plan.changes) await setSplit(change.id, change.split, stamp);
        if (accountId && plan.amountMinor !== 0) {
          const payment: Transaction = {
            id: newId(),
            createdAt: stamp,
            updatedAt: stamp,
            type: plan.amountMinor > 0 ? 'income' : 'expense',
            amountMinor: Math.abs(plan.amountMinor),
            currency: payCurrency,
            date,
            accountId,
            description,
            tags: [],
            isRecurring: false,
            settlementWith: personId,
          };
          await upsert(db, 'transactions', rows.transactionRow(payment));
          transactionId = payment.id;
        }
      });
      return { amountMinor: plan.amountMinor, previous, transactionId };
    },

    async undoSettle(record) {
      await db.withTransactionAsync(async () => {
        const stamp = now();
        // Soft delete like every other removal: the payment stays as history for a future sync.
        if (record.transactionId) await db.runAsync('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?', [stamp, stamp, record.transactionId]);
        for (const { id, split } of record.previous) await setSplit(id, split, stamp);
      });
    },

    async replaceAll(data) {
      await db.withTransactionAsync(async () => {
        for (const table of TABLES) await db.runAsync(`DELETE FROM ${table}`, []);
        await insertAll(db, data);
      });
    },
  };

  // expo-sqlite transactions are not exclusive: two overlapping calls would mix their writes.
  let queue: Promise<unknown> = Promise.resolve();
  return Object.fromEntries(
    Object.entries(repos).map(([name, method]) => [
      name,
      (...args: unknown[]) => {
        const run = queue.then(() => (method as (...params: unknown[]) => Promise<unknown>)(...args));
        queue = run.catch(() => undefined);
        return run;
      },
    ]),
  ) as unknown as Repositories;
}
