import { subscription, tx } from './testing/builders';
import { incomeBetween, monthlyEquivalent, spendingByCategory, yearlyEquivalent } from './breakdown';

const ME = 'person-me';

describe('spendingByCategory', () => {
  it('groups spending by category, largest first, uncategorised as null', () => {
    const txs = [
      tx({ categoryId: 'cat-food', amountMinor: 4280 }),
      tx({ categoryId: 'cat-home', amountMinor: 55000 }),
      tx({ categoryId: 'cat-food', amountMinor: 3120 }),
      tx({ categoryId: 'cat-food', type: 'refund', amountMinor: 400 }),
      tx({ categoryId: undefined, amountMinor: 150 }),
      tx({ categoryId: 'cat-salary', type: 'income', amountMinor: 175000 }),
    ];
    expect(spendingByCategory(txs, '2026-10-01', '2026-10-31', { currency: 'EUR', meId: ME })).toEqual([
      { categoryId: 'cat-home', amountMinor: 55000 },
      { categoryId: 'cat-food', amountMinor: 7000 },
      { categoryId: null, amountMinor: 150 },
    ]);
  });
});

describe('incomeBetween', () => {
  it('sums income in range and currency', () => {
    const txs = [
      tx({ type: 'income', amountMinor: 175000, date: '2026-10-27' }),
      tx({ type: 'income', amountMinor: 5000, date: '2026-10-03' }),
      tx({ type: 'expense', amountMinor: 999, date: '2026-10-03' }),
      tx({ type: 'income', amountMinor: 175000, date: '2026-09-27' }),
    ];
    expect(incomeBetween(txs, '2026-10-01', '2026-10-31', 'EUR')).toBe(180000);
  });
});

describe('monthlyEquivalent', () => {
  it('converts any frequency to a monthly cost, rounded to the cent', () => {
    expect(monthlyEquivalent(subscription({ amountMinor: 1099 }))).toBe(1099);
    expect(monthlyEquivalent(subscription({ amountMinor: 45600, frequency: { unit: 'year', interval: 1 } }))).toBe(3800);
    expect(monthlyEquivalent(subscription({ amountMinor: 3000, frequency: { unit: 'month', interval: 3 } }))).toBe(1000);
    // 365.25 / 7 / 12 ≈ 4.348 weeks per month
    expect(monthlyEquivalent(subscription({ amountMinor: 1000, frequency: { unit: 'week', interval: 1 } }))).toBe(4348);
  });
});

describe('yearlyEquivalent', () => {
  it('turns any frequency into a yearly cost', () => {
    expect(yearlyEquivalent(subscription({ amountMinor: 1399 }))).toBe(16788);
    expect(yearlyEquivalent(subscription({ amountMinor: 4990, frequency: { unit: 'year', interval: 1 } }))).toBe(4990);
    expect(yearlyEquivalent(subscription({ amountMinor: 3000, frequency: { unit: 'month', interval: 3 } }))).toBe(12000);
    expect(yearlyEquivalent(subscription({ amountMinor: 1000, frequency: { unit: 'week', interval: 1 } }))).toBe(52179);
  });
});
