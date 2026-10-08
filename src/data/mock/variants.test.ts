import { accountBalance } from '@/domain/accounts';
import { monthStart } from '@/domain/dates';
import { goalProgress } from '@/domain/goals';
import { spendingBetween } from '@/domain/spending';
import { buildBackup } from '@/features/settings/export';
import { parseBackup } from '@/features/settings/restore';

import { createEmptyDataset } from '../defaults';
import { createDataset, PINNED_TODAY } from './seed';
import { createEdgeDataset, prototypeDataset, resolveFakeDate, withoutIncome } from './variants';

describe('resolveFakeDate', () => {
  const now = new Date(2027, 1, 3, 10, 0);

  it('pins the prototype to 24 October 2026, or to the first or last day of that month', () => {
    expect(resolveFakeDate('pinned', now)).toBe('2026-10-24');
    expect(resolveFakeDate('monthStart', now)).toBe('2026-10-01');
    expect(resolveFakeDate('monthEnd', now)).toBe('2026-10-31');
  });

  it('can follow the real calendar', () => {
    expect(resolveFakeDate('real', now)).toBe('2027-02-03');
  });
});

describe('example data without income', () => {
  const full = createDataset();
  const data = withoutIncome(full);

  it('drops the income and keeps every other movement as it was', () => {
    expect(data.transactions.some((t) => t.type === 'income' && !t.settlementWith)).toBe(false);
    expect(data.transactions).toEqual(full.transactions.filter((t) => t.type !== 'income' || t.settlementWith));
  });

  it('keeps the balances of today, so only the missing income changes the screens', () => {
    for (const account of full.accounts) {
      const changed = data.accounts.find((a) => a.id === account.id)!;
      expect(accountBalance(changed, data.transactions, data.meId)).toBe(accountBalance(account, full.transactions, full.meId));
    }
  });
});

describe('edge-case data', () => {
  const data = createEdgeDataset(PINNED_TODAY);
  const options = { currency: 'EUR', meId: data.meId };
  const from = monthStart(PINNED_TODAY);
  const balances = data.accounts.map((a) => accountBalance(a, data.transactions, data.meId));

  it('is identical every time', () => {
    expect(createEdgeDataset(PINNED_TODAY)).toEqual(data);
  });

  it('passes the same checks as a restored backup', () => {
    expect(parseBackup(buildBackup(data, '2026-10-24T10:00:00Z')).ok).toBe(true);
  });

  it('puts nothing after today, whatever today is', () => {
    const early = createEdgeDataset('2026-10-01');
    expect(early.transactions.every((t) => t.date <= '2026-10-01')).toBe(true);
    expect(early.goals.every((g) => g.contributions.every((c) => c.date <= '2026-10-01'))).toBe(true);
  });

  it('has a balance over a million euro and one below zero', () => {
    expect(Math.max(...balances)).toBeGreaterThanOrEqual(100_000_000);
    expect(Math.min(...balances)).toBeLessThan(0);
  });

  it('has a one-cent movement and one of tens of thousands of euro', () => {
    const amounts = data.transactions.map((t) => t.amountMinor);
    expect(Math.min(...amounts)).toBe(1);
    expect(Math.max(...amounts)).toBeGreaterThanOrEqual(4_000_000);
  });

  it('crowds today with movements', () => {
    expect(data.transactions.filter((t) => t.date === PINNED_TODAY).length).toBeGreaterThanOrEqual(15);
  });

  it('splits a dinner among eight people', () => {
    expect(data.transactions.some((t) => t.split?.length === 8)).toBe(true);
  });

  it('has a category budget used exactly to the cent', () => {
    const budget = data.budgets.find((b) => b.categoryId === 'cat-care')!;
    expect(spendingBetween(data.transactions, from, PINNED_TODAY, { ...options, categoryId: 'cat-care' })).toBe(budget.amountMinor);
  });

  it('has a category with more refunded than spent this month', () => {
    expect(spendingBetween(data.transactions, from, PINNED_TODAY, { ...options, categoryId: 'cat-travel' })).toBeLessThan(0);
  });

  it('has a movement without a category and a subscription charged today', () => {
    expect(data.transactions.some((t) => t.type === 'expense' && !t.categoryId)).toBe(true);
    expect(data.transactions.some((t) => t.subscriptionId && t.date === PINNED_TODAY)).toBe(true);
  });

  it('has a goal reached, one past its target and one late on its date', () => {
    const goals = data.goals.map((goal) => ({ goal, progress: goalProgress(goal, PINNED_TODAY) }));
    expect(goals.some(({ progress }) => progress.reached)).toBe(true);
    expect(goals.some(({ goal, progress }) => progress.savedMinor > goal.targetMinor)).toBe(true);
    expect(goals.some(({ goal, progress }) => !progress.reached && goal.targetDate !== undefined && goal.targetDate < PINNED_TODAY)).toBe(true);
  });

  it('has names far longer than a row', () => {
    for (const list of [data.accounts, data.categories, data.people, data.subscriptions, data.goals]) {
      expect(Math.max(...list.map((record) => record.name.length))).toBeGreaterThanOrEqual(40);
    }
    expect(Math.max(...data.transactions.map((t) => t.merchant?.length ?? 0))).toBeGreaterThanOrEqual(40);
  });
});

describe('prototypeDataset', () => {
  it('builds each kind of data on the chosen day', () => {
    expect(prototypeDataset('full', '2026-10-01')).toEqual(createDataset('2026-10-01'));
    expect(prototypeDataset('noIncome', PINNED_TODAY)).toEqual(withoutIncome(createDataset(PINNED_TODAY)));
    expect(prototypeDataset('edge', PINNED_TODAY)).toEqual(createEdgeDataset(PINNED_TODAY));
    expect(prototypeDataset('empty', '2026-10-01')).toEqual(createEmptyDataset('2026-10-01'));
  });
});
