import { createDataset } from '@/data/mock/seed';
import { tx } from '@/domain/testing/builders';

import { defaultAccountId, frequentCategories, recentTemplates } from './suggestions';

const base = createDataset();
const at = (transactions: ReturnType<typeof tx>[]) => ({ ...base, transactions });

describe('frequentCategories', () => {
  it('orders expense categories by use in the last 90 days, then fills with defaults', () => {
    const data = at([
      tx({ categoryId: 'cat-transport', date: '2026-10-20' }),
      tx({ categoryId: 'cat-restaurants', date: '2026-10-21' }),
      tx({ categoryId: 'cat-restaurants', date: '2026-10-22' }),
      tx({ categoryId: 'cat-home', date: '2026-05-01' }),
    ]);
    const ids = frequentCategories(data, 4).map((c) => c.id);
    expect(ids.slice(0, 2)).toEqual(['cat-restaurants', 'cat-transport']);
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(4);
  });
});

describe('defaultAccountId', () => {
  it('proposes the account of the latest expense', () => {
    const data = at([
      tx({ accountId: 'acc-bank', date: '2026-10-20' }),
      tx({ accountId: 'acc-cash', date: '2026-10-23' }),
      tx({ accountId: 'acc-bank', type: 'income', date: '2026-10-24' }),
    ]);
    expect(defaultAccountId(data)).toBe('acc-cash');
  });

  it('falls back to the first account', () => {
    expect(defaultAccountId(at([]))).toBe('acc-bank');
  });
});

describe('recentTemplates', () => {
  it('returns the most frequent merchants with their latest amount, skipping recurring charges', () => {
    const data = at([
      tx({ merchant: 'Bar Centrale', amountMinor: 150, date: '2026-10-20', categoryId: 'cat-restaurants', accountId: 'acc-cash' }),
      tx({ merchant: 'Bar Centrale', amountMinor: 280, date: '2026-10-22', categoryId: 'cat-restaurants', accountId: 'acc-cash' }),
      tx({ merchant: 'Esselunga', amountMinor: 4280, date: '2026-10-21', categoryId: 'cat-groceries' }),
      tx({ merchant: 'Spotify', amountMinor: 1099, date: '2026-10-23', subscriptionId: 'sub-spotify', isRecurring: true }),
      tx({ merchant: 'Affitto', amountMinor: 55000, date: '2026-10-01', isRecurring: true }),
    ]);
    expect(recentTemplates(data, 3)).toEqual([
      { merchant: 'Bar Centrale', amountMinor: 280, categoryId: 'cat-restaurants', accountId: 'acc-cash' },
      { merchant: 'Esselunga', amountMinor: 4280, categoryId: 'cat-groceries', accountId: 'acc-revolut' },
    ]);
  });
});
