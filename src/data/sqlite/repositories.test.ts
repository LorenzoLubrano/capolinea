/// <reference types="node" />
import { randomUUID } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { LocalDate } from '@/domain/types';

import { createEmptyDataset } from '../defaults';
import { createDataset, type Dataset } from '../mock/seed';
import { describeRepositoriesContract } from '../testing/repositories-contract';
import { createSqliteRepositories, initialiseDatabase } from './repositories';
import { openTestDatabase } from './testing/node-database';

async function openRepositories(today: LocalDate, location?: string) {
  const db = openTestDatabase(location);
  await initialiseDatabase(db, { backup: jest.fn() });
  return { db, repos: createSqliteRepositories(db, { today: () => today, newId: randomUUID }) };
}

describeRepositoriesContract('SQLite repositories', async (dataset: Dataset) => {
  const { repos } = await openRepositories(dataset.today);
  await repos.replaceAll(dataset);
  return repos;
});

describe('SQLite repositories: the database', () => {
  it('starts a new database with the user and the default categories', async () => {
    const { repos } = await openRepositories('2026-10-09');

    expect(await repos.snapshot()).toEqual(createEmptyDataset('2026-10-09'));
  });

  it('adds the user and the default categories only once', async () => {
    const { db, repos } = await openRepositories('2026-10-09');
    await repos.addPerson('Sara');

    await initialiseDatabase(db, { backup: jest.fn() });

    expect((await repos.snapshot()).people.map((p) => p.name)).toEqual(['Lorenzo', 'Sara']);
  });

  it('keeps the data after the app is closed and opened again', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'capolinea-'));
    try {
      const file = join(dir, 'capolinea.db');
      const first = await openRepositories('2026-10-09', file);
      const account = await first.repos.saveAccount({
        name: 'Contanti', type: 'cash', currency: 'EUR', openingBalanceMinor: 0, color: 'green', includeInTotal: true, archived: false, sortOrder: 0,
      });
      const coffee = await first.repos.addTransaction({
        type: 'expense', amountMinor: 120, currency: 'EUR', date: '2026-10-09', accountId: account.id, categoryId: 'cat-restaurants', tags: [], isRecurring: false,
      });
      const before = await first.repos.snapshot();
      first.db.close();

      const second = await openRepositories('2026-10-09', file);

      expect(await second.repos.snapshot()).toEqual(before);
      expect(before.transactions).toEqual([coffee]);
      second.db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('leaves no trace of replaced data in the database files', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'capolinea-'));
    try {
      const file = join(dir, 'capolinea.db');
      const { db, repos } = await openRepositories('2026-10-09', file);
      await repos.addPerson('Segretissimo Rossi');

      await repos.replaceAll(createEmptyDataset('2026-10-09'));

      const bytes = ['', '-wal']
        .map((suffix) => join(dir, `capolinea.db${suffix}`))
        .filter((path) => existsSync(path))
        .map((path) => readFileSync(path).toString('latin1'))
        .join('');
      expect(bytes).not.toContain('Segretissimo');
      db.close();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('takes today from the clock, not from restored data', async () => {
    const { repos } = await openRepositories('2026-12-01');

    await repos.replaceAll(createDataset('2026-10-24'));

    expect((await repos.snapshot()).today).toBe('2026-12-01');
  });
});

describe('SQLite repositories: speed', () => {
  it('writes a large backup in batches, not one statement per record', async () => {
    const db = openTestDatabase();
    await initialiseDatabase(db, { backup: jest.fn() });
    let statements = 0;
    const counted = { ...db, runAsync: (source: string, params: (string | number | null)[]) => ((statements += 1), db.runAsync(source, params)) };
    const repos = createSqliteRepositories(counted, { today: () => '2026-10-24', newId: randomUUID });
    const years = createDataset('2026-10-24', '2011-10-25');

    await repos.replaceAll(years);

    expect(years.transactions.length).toBeGreaterThan(9000);
    // Each statement is a trip to the native driver: on the phone, one per record took 16 s.
    expect(statements).toBeLessThan(400);
    expect((await repos.snapshot()).transactions).toEqual(years.transactions);
  });
});

