import { tx } from './testing/builders';
import { accountBalance, totalBalance } from './accounts';
import type { Account } from './types';

const account = (overrides: Partial<Account>): Account => ({
  id: 'acc-revolut',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  name: 'Revolut',
  type: 'ewallet',
  currency: 'EUR',
  openingBalanceMinor: 100000,
  color: '#1C5DAE',
  includeInTotal: true,
  archived: false,
  sortOrder: 0,
  ...overrides,
});

describe('accountBalance', () => {
  it('applies expenses, income, refunds and transfers in both directions', () => {
    const revolut = account({ id: 'acc-revolut' });
    const txs = [
      tx({ accountId: 'acc-revolut', type: 'expense', amountMinor: 4280 }),
      tx({ accountId: 'acc-revolut', type: 'income', amountMinor: 175000 }),
      tx({ accountId: 'acc-revolut', type: 'refund', amountMinor: 2999 }),
      tx({ accountId: 'acc-revolut', type: 'transfer', toAccountId: 'acc-savings', amountMinor: 20000 }),
      tx({ accountId: 'acc-bank', type: 'transfer', toAccountId: 'acc-revolut', amountMinor: 5000 }),
      tx({ accountId: 'acc-bank', type: 'expense', amountMinor: 99999 }),
      tx({ accountId: 'acc-revolut', type: 'expense', amountMinor: 50000, deletedAt: '2026-10-02T00:00:00Z' }),
    ];
    expect(accountBalance(revolut, txs)).toBe(100000 - 4280 + 175000 + 2999 - 20000 + 5000);
  });

  it('counts the full amount of a split expense: the account paid all of it', () => {
    const revolut = account({ openingBalanceMinor: 0 });
    const dinner = tx({
      amountMinor: 6000,
      split: [
        { personId: 'me', amountMinor: 3000, settled: false },
        { personId: 'mario', amountMinor: 3000, settled: false },
      ],
    });
    expect(accountBalance(revolut, [dinner])).toBe(-6000);
  });
});

describe('totalBalance', () => {
  it('sums accounts included in the total, in the main currency only', () => {
    const accounts = [
      account({ id: 'a', openingBalanceMinor: 1000 }),
      account({ id: 'b', openingBalanceMinor: 2000, includeInTotal: false }),
      account({ id: 'c', openingBalanceMinor: 3000, currency: 'USD' }),
      account({ id: 'd', openingBalanceMinor: 4000, archived: true }),
      account({ id: 'e', openingBalanceMinor: -500, type: 'credit_card' }),
    ];
    expect(totalBalance(accounts, [], 'EUR')).toEqual({ totalMinor: 500, accountCount: 2 });
  });
});
