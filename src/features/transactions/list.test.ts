import { tx } from '@/domain/testing/builders';

import { activeFilterCount, applyFilters, DEFAULT_FILTERS, groupByDay, sortTransactions, type Filters } from './list';

const ME = 'me';
const today = '2026-10-24';

describe('groupByDay', () => {
  it('groups by date, newest day first, with the day spending', () => {
    const a = tx({ date: '2026-10-22', amountMinor: 1000, createdAt: '2026-10-22T08:00:00Z' });
    const b = tx({ date: '2026-10-24', amountMinor: 500 });
    const c = tx({ date: '2026-10-22', amountMinor: 250, createdAt: '2026-10-22T19:00:00Z' });
    const income = tx({ date: '2026-10-22', type: 'income', amountMinor: 9999 });
    const days = groupByDay([a, b, c, income], ME);
    expect(days.map((d) => d.date)).toEqual(['2026-10-24', '2026-10-22']);
    expect(days[1].data.map((t) => t.id)).toEqual([c.id, a.id, income.id]);
    expect(days[1].totalMinor).toBe(1250);
  });

  it('puts the most recently added first within a day', () => {
    const early = tx({ date: '2026-10-22', createdAt: '2026-10-22T08:00:00Z' });
    const late = tx({ date: '2026-10-22', createdAt: '2026-10-22T19:00:00Z' });
    expect(groupByDay([early, late], ME)[0].data.map((t) => t.id)).toEqual([late.id, early.id]);
  });

  it('counts only my share of a split expense', () => {
    const dinner = tx({
      date: '2026-10-18',
      amountMinor: 6000,
      paidByPersonId: ME,
      split: [
        { personId: ME, amountMinor: 3000, settled: true },
        { personId: 'mario', amountMinor: 3000, settled: false },
      ],
    });
    expect(groupByDay([dinner], ME)[0].totalMinor).toBe(3000);
  });
});

describe('applyFilters', () => {
  const expense = tx({ date: '2026-10-20', categoryId: 'cat-food', accountId: 'acc-bank' });
  const refund = tx({ date: '2026-10-19', type: 'refund' });
  const salary = tx({ date: '2026-10-10', type: 'income' });
  const transfer = tx({ date: '2026-09-28', type: 'transfer', accountId: 'acc-bank', toAccountId: 'acc-savings' });
  const old = tx({ date: '2026-07-02', categoryId: 'cat-food' });
  const all = [expense, refund, salary, transfer, old];
  const run = (change: Partial<Filters>) => applyFilters(all, { ...DEFAULT_FILTERS, ...change }, today).map((t) => t.id);

  it('keeps everything by default', () => {
    expect(run({})).toEqual(all.map((t) => t.id));
  });

  it('filters by kind; refunds count as money in', () => {
    expect(run({ kind: 'expense' })).toEqual([expense.id, old.id]);
    expect(run({ kind: 'income' })).toEqual([refund.id, salary.id]);
    expect(run({ kind: 'transfer' })).toEqual([transfer.id]);
  });

  it('filters by period', () => {
    expect(run({ period: 'month' })).toEqual([expense.id, refund.id, salary.id]);
    expect(run({ period: 'last-month' })).toEqual([transfer.id]);
    expect(run({ period: '3-months' })).toEqual([expense.id, refund.id, salary.id, transfer.id]);
  });

  it('filters by category and by account, either side of a transfer', () => {
    expect(run({ categoryIds: ['cat-food'] })).toEqual([expense.id, old.id]);
    expect(run({ accountIds: ['acc-savings'] })).toEqual([transfer.id]);
  });
});

describe('sortTransactions', () => {
  const small = tx({ date: '2026-10-20', amountMinor: 100 });
  const big = tx({ date: '2026-10-01', amountMinor: 9000 });
  it('sorts by amount both ways', () => {
    expect(sortTransactions([small, big], 'amount-desc').map((t) => t.id)).toEqual([big.id, small.id]);
    expect(sortTransactions([big, small], 'amount-asc').map((t) => t.id)).toEqual([small.id, big.id]);
  });
  it('sorts by date both ways', () => {
    expect(sortTransactions([big, small], 'date-desc').map((t) => t.id)).toEqual([small.id, big.id]);
    expect(sortTransactions([small, big], 'date-asc').map((t) => t.id)).toEqual([big.id, small.id]);
  });
});

describe('activeFilterCount', () => {
  it('counts what differs from the defaults, kind excluded (it has its own chips)', () => {
    expect(activeFilterCount(DEFAULT_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, kind: 'income' })).toBe(0);
    expect(activeFilterCount({ ...DEFAULT_FILTERS, period: 'month', categoryIds: ['a', 'b'], sort: 'amount-desc' })).toBe(3);
  });
});
