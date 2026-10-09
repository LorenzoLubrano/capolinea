/// <reference types="node" />
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import { buildAnalysis } from '@/features/analytics/analysis';
import { buildBudgetOverview } from '@/features/budget/overview';
import { buildHomeSummary } from '@/features/home/summary';
import { applyFilters, DEFAULT_FILTERS, groupByDay } from '@/features/transactions/list';

import { createDataset, PINNED_TODAY } from '../mock/seed';
import { createSqliteRepositories, initialiseDatabase } from './repositories';
import { openTestDatabase } from './testing/node-database';

/** Milliseconds a task takes, the best of a few runs: the others pay for warming up. */
async function timed<T>(task: () => T | Promise<T>, runs = 3): Promise<{ ms: number; result: T }> {
  let best = Infinity;
  let result!: T;
  for (let i = 0; i < runs; i += 1) {
    const start = performance.now();
    result = await task();
    best = Math.min(best, performance.now() - start);
  }
  return { ms: Math.round(best), result };
}

/**
 * Years of movements: five at the pace of the example (about two a day), and fifteen, as many
 * movements as five years of someone who records everything. Node is faster than the phone (Hermes,
 * a mobile CPU): these ceilings only catch a big regression; the phone is measured at Fermata A.
 */
describe('years of data', () => {
  it.each([
    ['5 years', '2021-10-25', 3000],
    ['15 years', '2011-10-25', 9000],
  ])('%s are written, read and turned into the screens in time', async (label, from, atLeast) => {
    const dataset = createDataset(PINNED_TODAY, from);
    const db = openTestDatabase();
    await initialiseDatabase(db, { backup: jest.fn() });
    const repos = createSqliteRepositories(db, { today: () => PINNED_TODAY, newId: randomUUID });

    const write = await timed(() => repos.replaceAll(dataset), 1);
    const read = await timed(() => repos.snapshot());
    const snapshot = read.result;
    const home = await timed(() => buildHomeSummary(snapshot));
    const budget = await timed(() => buildBudgetOverview(snapshot));
    const analysis = await timed(() => buildAnalysis(snapshot, 'month', 0));
    const movements = await timed(() => groupByDay(applyFilters(snapshot.transactions, DEFAULT_FILTERS, snapshot.today), snapshot.meId));

    const report = { movements: snapshot.transactions.length, write: write.ms, read: read.ms, home: home.ms, budget: budget.ms, analysis: analysis.ms, list: movements.ms };
    console.log(label, JSON.stringify(report));

    expect(snapshot.transactions).toHaveLength(dataset.transactions.length);
    expect(report.movements).toBeGreaterThan(atLeast);
    expect(report.read).toBeLessThan(2000);
    expect(Math.max(report.home, report.budget, report.analysis, report.list)).toBeLessThan(500);
  });
});
