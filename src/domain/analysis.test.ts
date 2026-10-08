import { tx } from './testing/builders';
import {
  dayHabits,
  firstMovementDate,
  isVariable,
  largestExpenses,
  magnitudeLevel,
  merchantKey,
  periodAt,
  spendingByMerchant,
  spendingSeries,
  typicalSpending,
  usualLevel,
} from './analysis';

const ME = 'person-me';
const options = { currency: 'EUR', meId: ME };

describe('periodAt', () => {
  it('finds the week from Monday to Sunday, also across months', () => {
    expect(periodAt('week', '2026-10-24')).toEqual({ unit: 'week', from: '2026-10-19', to: '2026-10-25' });
    expect(periodAt('week', '2026-10-01')).toEqual({ unit: 'week', from: '2026-09-28', to: '2026-10-04' });
    expect(periodAt('week', '2026-10-24', -1)).toEqual({ unit: 'week', from: '2026-10-12', to: '2026-10-18' });
  });

  it('moves by whole months, across years', () => {
    expect(periodAt('month', '2026-10-24', -1)).toEqual({ unit: 'month', from: '2026-09-01', to: '2026-09-30' });
    expect(periodAt('month', '2026-10-31', -10)).toEqual({ unit: 'month', from: '2025-12-01', to: '2025-12-31' });
  });

  it('covers the calendar year', () => {
    expect(periodAt('year', '2026-10-24')).toEqual({ unit: 'year', from: '2026-01-01', to: '2026-12-31' });
    expect(periodAt('year', '2026-10-24', -1)).toEqual({ unit: 'year', from: '2025-01-01', to: '2025-12-31' });
  });
});

describe('spendingSeries', () => {
  it('tiles the range with month buckets; the current one counts up to today, later ones are future', () => {
    const txs = [
      tx({ date: '2026-08-10', amountMinor: 1000 }),
      tx({ date: '2026-09-05', amountMinor: 2000 }),
      tx({ date: '2026-10-20', amountMinor: 3000 }),
      tx({ date: '2026-10-30', amountMinor: 999 }), // dated in the future
    ];
    const series = spendingSeries(txs, { from: '2026-08-01', to: '2026-11-30' }, 'month', '2026-10-24', options);
    expect(series).toEqual([
      { from: '2026-08-01', to: '2026-08-31', spentMinor: 1000, complete: true, future: false },
      { from: '2026-09-01', to: '2026-09-30', spentMinor: 2000, complete: true, future: false },
      { from: '2026-10-01', to: '2026-10-31', spentMinor: 3000, complete: false, future: false },
      { from: '2026-11-01', to: '2026-11-30', spentMinor: 0, complete: false, future: true },
    ]);
  });

  it('aligns week buckets to Monday and clips them to the range', () => {
    const series = spendingSeries([], { from: '2026-10-01', to: '2026-10-31' }, 'week', '2026-10-24', options);
    expect(series.map((b) => [b.from, b.to])).toEqual([
      ['2026-10-01', '2026-10-04'],
      ['2026-10-05', '2026-10-11'],
      ['2026-10-12', '2026-10-18'],
      ['2026-10-19', '2026-10-25'],
      ['2026-10-26', '2026-10-31'],
    ]);
  });

  it('has one bucket per day, counting my share and subtracting refunds', () => {
    const txs = [
      tx({ date: '2026-10-20', amountMinor: 6000, split: [{ personId: ME, amountMinor: 2000, settled: true }, { personId: 'p-2', amountMinor: 4000, settled: false }] }),
      tx({ date: '2026-10-21', amountMinor: 5000 }),
      tx({ date: '2026-10-21', type: 'refund', amountMinor: 1500 }),
      tx({ date: '2026-10-21', type: 'income', amountMinor: 90000 }),
    ];
    const series = spendingSeries(txs, { from: '2026-10-20', to: '2026-10-22' }, 'day', '2026-10-24', options);
    expect(series.map((b) => b.spentMinor)).toEqual([2000, 3500, 0]);
    expect(series.every((b) => b.from === b.to)).toBe(true);
  });
});

describe('firstMovementDate', () => {
  it('is the date of the oldest movement that is not deleted', () => {
    const txs = [tx({ date: '2026-09-01' }), tx({ date: '2026-08-01', deletedAt: '2026-10-01T00:00:00Z' }), tx({ date: '2026-08-15' })];
    expect(firstMovementDate(txs)).toBe('2026-08-15');
    expect(firstMovementDate([])).toBeNull();
  });
});

describe('typicalSpending', () => {
  const txs = [
    tx({ date: '2026-08-05', amountMinor: 1000 }),
    tx({ date: '2026-09-10', amountMinor: 3000 }),
    tx({ date: '2026-09-28', amountMinor: 9999 }), // after day 24: not part of "so far"
    tx({ date: '2026-10-03', amountMinor: 2500 }),
  ];

  it('averages the same days of the previous periods, from the first movement on', () => {
    // October up to the 24th against 1–24 September and 1–24 August; July had no data yet.
    expect(typicalSpending(txs, periodAt('month', '2026-10-24'), '2026-10-24', 3, options)).toBe(2000);
  });

  it('uses whole periods for a period that is over', () => {
    expect(typicalSpending(txs, periodAt('month', '2026-10-24', -1), '2026-10-24', 3, options)).toBe(1000);
  });

  it('takes the middle of the previous periods, so one week with the rent does not make every other week look cheap', () => {
    const weeks = [
      tx({ date: '2026-09-21', amountMinor: 1000 }),
      tx({ date: '2026-09-28', amountMinor: 1200 }),
      tx({ date: '2026-10-01', amountMinor: 55000 }), // rent
      tx({ date: '2026-10-05', amountMinor: 1300 }),
      tx({ date: '2026-10-12', amountMinor: 1100 }),
      tx({ date: '2026-10-19', amountMinor: 900 }),
    ];
    // Weeks before 19 October: 1000, 56200, 1300, 1100 → middle values 1100 and 1300.
    expect(typicalSpending(weeks, periodAt('week', '2026-10-24'), '2026-10-24', 4, options)).toBe(1200);
  });

  it('is null when there is nothing earlier to compare with', () => {
    expect(typicalSpending(txs, periodAt('month', '2026-08-05'), '2026-10-24', 3, options)).toBeNull();
    expect(typicalSpending(txs, periodAt('year', '2026-10-24'), '2026-10-24', 3, options)).toBeNull();
  });
});

describe('usualLevel', () => {
  it('is the middle of the complete buckets since the first movement', () => {
    const buckets = [
      { from: '2026-07-01', to: '2026-07-31', spentMinor: 0, complete: true, future: false },
      { from: '2026-08-01', to: '2026-08-31', spentMinor: 1000, complete: true, future: false },
      { from: '2026-09-01', to: '2026-09-30', spentMinor: 3000, complete: true, future: false },
      { from: '2026-10-01', to: '2026-10-31', spentMinor: 500, complete: false, future: false },
      { from: '2026-11-01', to: '2026-11-30', spentMinor: 0, complete: false, future: true },
    ];
    expect(usualLevel(buckets, '2026-08-03')).toBe(2000);
    expect(usualLevel(buckets.slice(3), '2026-08-03')).toBeNull();
  });

  it('is not pulled up by one heavy bucket', () => {
    const bucket = (from: string, spentMinor: number) => ({ from, to: from, spentMinor, complete: true, future: false });
    expect(usualLevel([bucket('2026-10-01', 1000), bucket('2026-10-02', 9000), bucket('2026-10-03', 1100)], '2026-10-01')).toBe(1100);
  });
});

describe('dayHabits', () => {
  it('averages each weekday and counts the days without spending, up to today', () => {
    // Mon 12 to Sun 25 October, today Saturday 24: two Mondays, one Sunday so far.
    const txs = [
      tx({ date: '2026-10-12', amountMinor: 1000 }),
      tx({ date: '2026-10-19', amountMinor: 3000 }),
      tx({ date: '2026-10-17', amountMinor: 4000 }),
      tx({ date: '2026-10-24', amountMinor: 2000 }),
      tx({ date: '2026-10-25', amountMinor: 7000 }), // tomorrow
    ];
    const days = spendingSeries(txs, { from: '2026-10-12', to: '2026-10-25' }, 'day', '2026-10-24', options);
    const habits = dayHabits(days, '2026-10-01');
    expect(habits.weekdayAverages).toEqual([2000, 0, 0, 0, 0, 3000, 0]);
    expect(habits.zeroDays).toBe(9);
    expect(habits.pastDays).toBe(13);
  });

  it('ignores days before the first movement', () => {
    const days = spendingSeries([tx({ date: '2026-10-23', amountMinor: 500 })], { from: '2026-10-19', to: '2026-10-25' }, 'day', '2026-10-24', options);
    const habits = dayHabits(days, '2026-10-23');
    expect(habits.pastDays).toBe(2);
    expect(habits.weekdayAverages).toEqual([null, null, null, null, 500, 0, null]);
  });
});

describe('magnitudeLevel', () => {
  it('places an amount on a fixed ramp, so the same dot means the same amount in every period', () => {
    const ramp = [1500, 4000, 10000];
    expect(magnitudeLevel(0, ramp)).toBe(0);
    expect(magnitudeLevel(-300, ramp)).toBe(0);
    expect(magnitudeLevel(1, ramp)).toBe(1);
    expect(magnitudeLevel(1499, ramp)).toBe(1);
    expect(magnitudeLevel(1500, ramp)).toBe(2);
    expect(magnitudeLevel(9999, ramp)).toBe(3);
    expect(magnitudeLevel(25000, ramp)).toBe(4);
  });
});

describe('merchantKey', () => {
  it('ignores case, accents and outer spaces', () => {
    expect(merchantKey(' Caffè Nero ')).toBe(merchantKey('caffe nero'));
  });
});

describe('spendingByMerchant', () => {
  it('groups by merchant with the latest spelling, counts purchases and nets refunds', () => {
    const txs = [
      tx({ date: '2026-10-02', merchant: 'esselunga', amountMinor: 3000, categoryId: 'cat-groceries' }),
      tx({ date: '2026-10-09', merchant: 'Esselunga', amountMinor: 2000, categoryId: 'cat-groceries' }),
      tx({ date: '2026-10-05', merchant: 'Amazon', amountMinor: 4000, categoryId: 'cat-shopping' }),
      tx({ date: '2026-10-06', merchant: 'Amazon', type: 'refund', amountMinor: 1000, categoryId: 'cat-shopping' }),
      tx({ date: '2026-10-07', merchant: 'Zara', amountMinor: 2000 }),
      tx({ date: '2026-10-08', merchant: 'Zara', type: 'refund', amountMinor: 2000 }),
      tx({ date: '2026-10-01', merchant: 'Stipendio', type: 'income', amountMinor: 175000 }),
      tx({ date: '2026-10-03', amountMinor: 800 }), // no merchant
      tx({ date: '2026-09-30', merchant: 'Esselunga', amountMinor: 9000 }), // before the range
    ];
    expect(spendingByMerchant(txs, '2026-10-01', '2026-10-31', options)).toEqual([
      { key: 'esselunga', name: 'Esselunga', spentMinor: 5000, count: 2, categoryId: 'cat-groceries', lastDate: '2026-10-09' },
      { key: 'amazon', name: 'Amazon', spentMinor: 3000, count: 1, categoryId: 'cat-shopping', lastDate: '2026-10-05' },
    ]);
  });
});

describe('largestExpenses', () => {
  it('lists the biggest expenses by my share, largest first', () => {
    const shared = tx({ date: '2026-10-04', amountMinor: 9000, split: [{ personId: ME, amountMinor: 3000, settled: true }, { personId: 'p-2', amountMinor: 6000, settled: true }] });
    const big = tx({ date: '2026-10-05', amountMinor: 5000 });
    const small = tx({ date: '2026-10-06', amountMinor: 1000 });
    const refund = tx({ date: '2026-10-07', type: 'refund', amountMinor: 8000 });
    const outside = tx({ date: '2026-09-07', amountMinor: 99000 });
    expect(largestExpenses([small, shared, big, refund, outside], '2026-10-01', '2026-10-31', options, 2)).toEqual([
      { tx: big, amountMinor: 5000 },
      { tx: shared, amountMinor: 3000 },
    ]);
  });
});

describe('isVariable', () => {
  it('leaves out recurring and subscription charges', () => {
    expect(isVariable(tx({}))).toBe(true);
    expect(isVariable(tx({ isRecurring: true }))).toBe(false);
    expect(isVariable(tx({ subscriptionId: 'sub-1' }))).toBe(false);
  });
});
