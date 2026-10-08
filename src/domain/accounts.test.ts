import { tx } from './testing/builders';
import { accountBalance, accountFlows, openingForBalance, totalBalance } from './accounts';
import type { Account } from './types';

const ME = 'person-me';

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
    expect(accountBalance(revolut, txs, ME)).toBe(100000 - 4280 + 175000 + 2999 - 20000 + 5000);
  });

  it('counts the full amount of a split expense: the account paid all of it', () => {
    const revolut = account({ openingBalanceMinor: 0 });
    const dinner = tx({
      amountMinor: 6000,
      split: [
        { personId: ME, amountMinor: 3000, settled: false },
        { personId: 'mario', amountMinor: 3000, settled: false },
      ],
    });
    expect(accountBalance(revolut, [dinner], ME)).toBe(-6000);
  });

  it('leaves the account alone when someone else paid', () => {
    const revolut = account({ openingBalanceMinor: 0 });
    const cinema = tx({
      amountMinor: 2400,
      paidByPersonId: 'giulia',
      split: [
        { personId: ME, amountMinor: 1200, settled: false },
        { personId: 'giulia', amountMinor: 1200, settled: true },
      ],
    });
    expect(accountBalance(revolut, [cinema], ME)).toBe(0);
  });

  it('moves the account with a settlement like any payment', () => {
    const revolut = account({ openingBalanceMinor: 0 });
    const paidBack = tx({ type: 'income', amountMinor: 3000, settlementWith: 'mario' });
    expect(accountBalance(revolut, [paidBack], ME)).toBe(3000);
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
    expect(totalBalance(accounts, [], 'EUR', ME)).toEqual({ totalMinor: 500, accountCount: 2 });
  });
});

describe('openingForBalance', () => {
  it('finds the opening balance that makes the account show the real balance today', () => {
    const revolut = account({ openingBalanceMinor: 1000 });
    const txs = [tx({ amountMinor: 300 }), tx({ type: 'income', amountMinor: 50 })];
    expect(accountBalance(revolut, txs, ME)).toBe(750);
    expect(openingForBalance(revolut, txs, ME, 500)).toBe(750);
    expect(accountBalance({ ...revolut, openingBalanceMinor: 750 }, txs, ME)).toBe(500);
  });
});

describe('accountFlows', () => {
  it('splits what came in and what went out in a range', () => {
    const revolut = account({});
    const txs = [
      tx({ date: '2026-10-02', amountMinor: 4000 }),
      tx({ date: '2026-10-03', type: 'income', amountMinor: 10000 }),
      tx({ date: '2026-10-04', type: 'refund', amountMinor: 500 }),
      tx({ date: '2026-10-05', type: 'transfer', toAccountId: 'acc-bank', amountMinor: 2000 }),
      tx({ date: '2026-10-06', accountId: 'acc-bank', type: 'transfer', toAccountId: 'acc-revolut', amountMinor: 700 }),
      tx({ date: '2026-10-07', amountMinor: 2400, paidByPersonId: 'giulia' }),
      tx({ date: '2026-09-30', amountMinor: 9999 }),
    ];
    expect(accountFlows(revolut, txs, ME, '2026-10-01', '2026-10-31')).toEqual({ inMinor: 11200, outMinor: 6000 });
  });
});
