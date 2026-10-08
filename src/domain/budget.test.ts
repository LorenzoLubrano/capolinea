import { tx } from './testing/builders';
import { activeBudget, averageMonthlySpending, budgetHistory, budgetStatus, dailyAllowance, forecastMonthEnd, monthlyHistory, monthPace } from './budget';
import type { Budget } from './types';

const ME = 'person-me';

describe('monthPace', () => {
  it('is the share of the month elapsed, today included', () => {
    expect(monthPace('2026-10-24')).toBeCloseTo(24 / 31);
    expect(monthPace('2026-02-28')).toBe(1);
  });
});

describe('forecastMonthEnd', () => {
  it('adds upcoming recurring charges and projects only variable spending', () => {
    const txs = [
      tx({ date: '2026-10-01', amountMinor: 55000, isRecurring: true }), // rent
      tx({ date: '2026-10-05', amountMinor: 1099, subscriptionId: 'sub-spotify' }),
      tx({ date: '2026-10-10', amountMinor: 24000 }), // variable: 240 € in 24 days = 10 €/day
    ];
    const forecast = forecastMonthEnd(txs, '2026-10-24', {
      currency: 'EUR',
      meId: ME,
      upcomingRecurringMinor: 4989,
    });
    // spent 80.099 € + upcoming 49,89 € + 10 €/day × 7 days
    expect(forecast).toBe(55000 + 1099 + 24000 + 4989 + 7000);
  });

  it('equals what was spent on the last day of the month', () => {
    const txs = [tx({ date: '2026-10-31', amountMinor: 1500 })];
    expect(forecastMonthEnd(txs, '2026-10-31', { currency: 'EUR', meId: ME, upcomingRecurringMinor: 0 })).toBe(1500);
  });
});

describe('budgetStatus', () => {
  const pace = 0.5;

  it('is over when spending exceeds the budget', () => {
    expect(budgetStatus({ spentMinor: 160100, budgetMinor: 160000, pace })).toBe('over');
  });

  it('is near the limit from 80% of the budget', () => {
    expect(budgetStatus({ spentMinor: 128000, budgetMinor: 160000, pace: 0.9 })).toBe('near');
  });

  it('is ahead of pace when spending runs more than 5 points over the month elapsed', () => {
    expect(budgetStatus({ spentMinor: 90000, budgetMinor: 160000, pace })).toBe('ahead');
  });

  it('is on track otherwise', () => {
    expect(budgetStatus({ spentMinor: 80000, budgetMinor: 160000, pace })).toBe('on_track');
  });

  it('accepts a custom near-limit threshold', () => {
    expect(budgetStatus({ spentMinor: 112000, budgetMinor: 160000, pace: 0.9, nearThreshold: 0.7 })).toBe('near');
  });
});

describe('activeBudget', () => {
  const meta = { createdAt: '2026-08-01T08:00:00Z', updatedAt: '2026-08-01T08:00:00Z', currency: 'EUR' };
  const budgets: Budget[] = [
    { ...meta, id: 'g-old', scope: 'global', amountMinor: 150000, fromMonth: '2026-01' },
    { ...meta, id: 'g-new', scope: 'global', amountMinor: 160000, fromMonth: '2026-09' },
    { ...meta, id: 'g-future', scope: 'global', amountMinor: 999900, fromMonth: '2026-12' },
    { ...meta, id: 'food', scope: 'category', categoryId: 'cat-food', amountMinor: 35000, fromMonth: '2026-08' },
    { ...meta, id: 'gone', scope: 'category', categoryId: 'cat-bar', amountMinor: 1000, fromMonth: '2026-08', deletedAt: '2026-09-01T00:00:00Z' },
  ];

  it('picks the latest budget already in force for the month', () => {
    expect(activeBudget(budgets, '2026-10', 'global')?.id).toBe('g-new');
    expect(activeBudget(budgets, '2026-08', 'global')?.id).toBe('g-old');
  });

  it('finds a category budget and ignores deleted ones', () => {
    expect(activeBudget(budgets, '2026-10', 'category', 'cat-food')?.id).toBe('food');
    expect(activeBudget(budgets, '2026-10', 'category', 'cat-bar')).toBeUndefined();
  });
});

describe('monthlyHistory and averageMonthlySpending', () => {
  const txs = [
    tx({ date: '2026-07-05', amountMinor: 30000 }),
    tx({ date: '2026-08-05', amountMinor: 10000 }),
    tx({ date: '2026-09-05', amountMinor: 20000 }),
    tx({ date: '2026-09-20', amountMinor: 5000, categoryId: 'cat-food' }),
    tx({ date: '2026-10-05', amountMinor: 7000 }),
  ];
  const opts = { currency: 'EUR', meId: ME };

  it('lists the spending of the last months, oldest first, this month included', () => {
    expect(monthlyHistory(txs, '2026-10-24', 3, opts)).toEqual([
      { month: '2026-08-01', spentMinor: 10000 },
      { month: '2026-09-01', spentMinor: 25000 },
      { month: '2026-10-01', spentMinor: 7000 },
    ]);
  });

  it('averages the full months before this one', () => {
    expect(averageMonthlySpending(txs, '2026-10-24', 3, opts)).toBe(21667);
    expect(averageMonthlySpending(txs, '2026-10-24', 3, { ...opts, categoryId: 'cat-food' })).toBe(1667);
  });

  it('leaves out the months before the first movement', () => {
    const recent = txs.filter((t) => t.date >= '2026-08-01');
    expect(averageMonthlySpending(recent, '2026-10-24', 3, opts)).toBe(17500);
    expect(averageMonthlySpending(recent.filter((t) => t.date >= '2026-10-01'), '2026-10-24', 3, opts)).toBe(0);
  });
});

describe('dailyAllowance', () => {
  it('spreads what is left over the days left, today included', () => {
    expect(dailyAllowance(8000, '2026-10-24')).toBe(1000);
    expect(dailyAllowance(-500, '2026-10-24')).toBe(0);
  });
});

describe('forecastMonthEnd for one category', () => {
  it('projects only that category', () => {
    const txs = [tx({ date: '2026-10-10', amountMinor: 3100, categoryId: 'cat-food' }), tx({ date: '2026-10-10', amountMinor: 99900 })];
    expect(forecastMonthEnd(txs, '2026-10-31', { currency: 'EUR', meId: ME, upcomingRecurringMinor: 0, categoryId: 'cat-food' })).toBe(3100);
  });
});

describe('budgetHistory', () => {
  const meta = { createdAt: '2026-08-01T08:00:00Z', updatedAt: '2026-08-01T08:00:00Z', currency: 'EUR' };
  const budgets: Budget[] = [
    { ...meta, id: 'g-1', scope: 'global', amountMinor: 150000, fromMonth: '2026-08' },
    { ...meta, id: 'g-2', scope: 'global', amountMinor: 160000, fromMonth: '2026-10' },
  ];
  const txs = [
    tx({ date: '2026-07-20', amountMinor: 20000 }),
    tx({ date: '2026-08-10', amountMinor: 140000 }),
    tx({ date: '2026-09-10', amountMinor: 160000 }),
    tx({ date: '2026-10-10', amountMinor: 50000 }),
  ];
  const base = { budgets, transactions: txs, today: '2026-10-24', months: 6, currency: 'EUR', meId: ME };

  it('says month by month whether the global budget held, from the first movement on', () => {
    expect(budgetHistory({ ...base, until: '2026-10-24' })).toEqual([
      { month: '2026-07-01', budgetMinor: null, spentMinor: 20000, outcome: 'none' },
      { month: '2026-08-01', budgetMinor: 150000, spentMinor: 140000, outcome: 'kept' },
      { month: '2026-09-01', budgetMinor: 150000, spentMinor: 160000, outcome: 'over' },
      { month: '2026-10-01', budgetMinor: 160000, spentMinor: 50000, outcome: 'running' },
    ]);
  });

  it('ends at the month of `until`, so a past period shows the months up to it', () => {
    const history = budgetHistory({ ...base, until: '2026-09-15', months: 2 });
    expect(history.map((m) => [m.month, m.outcome])).toEqual([
      ['2026-08-01', 'kept'],
      ['2026-09-01', 'over'],
    ]);
  });
});
