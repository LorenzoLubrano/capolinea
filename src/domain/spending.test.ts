import { tx } from './testing/builders';
import { compareWithPreviousMonth, spendingBetween, spendingImpact } from './spending';

const ME = 'person-me';

describe('spendingImpact', () => {
  it('counts an expense in full', () => {
    expect(spendingImpact(tx({ amountMinor: 4280 }), ME)).toBe(4280);
  });

  it('counts only my share of a split expense', () => {
    const dinner = tx({
      amountMinor: 6000,
      split: [
        { personId: ME, amountMinor: 3000, settled: true },
        { personId: 'person-mario', amountMinor: 3000, settled: false },
      ],
    });
    expect(spendingImpact(dinner, ME)).toBe(3000);
  });

  it('subtracts refunds', () => {
    expect(spendingImpact(tx({ type: 'refund', amountMinor: 2999 }), ME)).toBe(-2999);
  });

  it('ignores income, transfers and deleted records', () => {
    expect(spendingImpact(tx({ type: 'income', amountMinor: 175000 }), ME)).toBe(0);
    expect(spendingImpact(tx({ type: 'transfer', amountMinor: 50000 }), ME)).toBe(0);
    expect(spendingImpact(tx({ deletedAt: '2026-10-11T10:00:00Z' }), ME)).toBe(0);
  });

  it('ignores a settlement: it evens out a split, the spending was counted with the split', () => {
    expect(spendingImpact(tx({ type: 'expense', amountMinor: 1200, settlementWith: 'person-giulia' }), ME)).toBe(0);
  });
});

describe('spendingBetween', () => {
  const txs = [
    tx({ date: '2026-09-30', amountMinor: 999 }),
    tx({ date: '2026-10-01', amountMinor: 1000, categoryId: 'cat-food' }),
    tx({ date: '2026-10-24', amountMinor: 250, categoryId: 'cat-transport' }),
    tx({ date: '2026-10-25', amountMinor: 777 }),
    tx({ date: '2026-10-05', amountMinor: 500, currency: 'USD' }),
  ];

  it('sums the inclusive range in one currency', () => {
    expect(spendingBetween(txs, '2026-10-01', '2026-10-24', { currency: 'EUR', meId: ME })).toBe(1250);
  });

  it('can filter by category', () => {
    expect(
      spendingBetween(txs, '2026-10-01', '2026-10-31', { currency: 'EUR', meId: ME, categoryId: 'cat-food' }),
    ).toBe(1000);
  });
});

describe('compareWithPreviousMonth', () => {
  it('compares with the same days of the previous month', () => {
    const txs = [
      tx({ date: '2026-09-10', amountMinor: 10000 }),
      tx({ date: '2026-09-28', amountMinor: 99999 }),
      tx({ date: '2026-10-10', amountMinor: 8000 }),
    ];
    expect(compareWithPreviousMonth(txs, '2026-10-24', { currency: 'EUR', meId: ME })).toEqual({
      currentMinor: 8000,
      previousMinor: 10000,
      change: -0.2,
    });
  });

  it('has no change ratio when the previous period is empty', () => {
    const txs = [tx({ date: '2026-10-10', amountMinor: 8000 })];
    expect(compareWithPreviousMonth(txs, '2026-10-24', { currency: 'EUR', meId: ME }).change).toBeNull();
  });
});
