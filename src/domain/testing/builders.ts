import type { Subscription, Transaction } from '../types';

/** Test-only builders with sensible defaults. */

const META = { createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-01T08:00:00Z' };

let seq = 0;

export function tx(overrides: Partial<Transaction>): Transaction {
  seq += 1;
  return {
    id: `tx-${seq}`,
    ...META,
    type: 'expense',
    amountMinor: 1000,
    currency: 'EUR',
    date: '2026-10-10',
    accountId: 'acc-revolut',
    tags: [],
    isRecurring: false,
    ...overrides,
  };
}

export function subscription(overrides: Partial<Subscription>): Subscription {
  seq += 1;
  return {
    id: `sub-${seq}`,
    ...META,
    name: 'Spotify',
    amountMinor: 1099,
    currency: 'EUR',
    frequency: { unit: 'month', interval: 1 },
    anchorDate: '2026-01-23',
    nextBillingDate: '2026-10-23',
    startDate: '2026-01-23',
    categoryId: 'cat-subscriptions',
    accountId: 'acc-revolut',
    active: true,
    ...overrides,
  };
}
