import { createDataset } from '@/data/mock/seed';
import { accountBalance } from '@/domain/accounts';

import { buildAccountDetail, buildAccountsOverview, buildCategoryList, buildPersonDetail, buildSharedOverview, categoryUsage } from './money';

const data = createDataset();

describe('buildAccountsOverview', () => {
  const overview = buildAccountsOverview(data);

  it('separates the accounts in the total from the others, in their order', () => {
    expect(overview.included.map((r) => r.account.id)).toEqual(['acc-bank', 'acc-revolut', 'acc-paypal', 'acc-cash', 'acc-card']);
    expect(overview.excluded.map((r) => r.account.id)).toEqual(['acc-savings']);
    expect(overview.archived).toEqual([]);
    expect(overview.totalMinor).toBe(overview.included.reduce((sum, r) => sum + r.balanceMinor, 0));
  });

  it('puts archived accounts apart, out of the total', () => {
    const accounts = data.accounts.map((a) => (a.id === 'acc-paypal' ? { ...a, archived: true } : a));
    const withArchived = buildAccountsOverview({ ...data, accounts });
    expect(withArchived.archived.map((r) => r.account.id)).toEqual(['acc-paypal']);
    expect(withArchived.included.some((r) => r.account.id === 'acc-paypal')).toBe(false);
  });
});

describe('buildAccountDetail', () => {
  it('gives the balance, the month in and out, and the latest movements', () => {
    const detail = buildAccountDetail(data, 'acc-revolut')!;
    const revolut = data.accounts.find((a) => a.id === 'acc-revolut')!;
    expect(detail.balanceMinor).toBe(accountBalance(revolut, data.transactions, data.meId));
    expect(detail.month.outMinor).toBeGreaterThan(0);
    expect(detail.movements.length).toBeLessThanOrEqual(20);
    expect(detail.movements.every((t) => t.accountId === 'acc-revolut' || t.toAccountId === 'acc-revolut')).toBe(true);
    const dates = detail.movements.map((t) => t.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(detail.canDelete).toBe(false);
  });

  it('lets only an account nothing uses be deleted', () => {
    const empty = { ...data.accounts[0], id: 'acc-new', name: 'Satispay' };
    expect(buildAccountDetail({ ...data, accounts: [...data.accounts, empty] }, 'acc-new')!.canDelete).toBe(true);
    // A subscription still charges this one, even without movements.
    const charged = { ...data, accounts: [...data.accounts, empty], subscriptions: [{ ...data.subscriptions[0], accountId: 'acc-new' }] };
    expect(buildAccountDetail(charged, 'acc-new')!.canDelete).toBe(false);
  });
});

describe('categories', () => {
  it('lists the categories of a kind with their movements, archived apart', () => {
    const categories = data.categories.map((c) => (c.id === 'cat-gifts' ? { ...c, archived: true } : c));
    const list = buildCategoryList({ ...data, categories }, 'expense');
    expect(list.active[0].category.id).toBe('cat-groceries');
    expect(list.active.some((r) => r.category.id === 'cat-gifts')).toBe(false);
    expect(list.archived.map((r) => r.category.id)).toEqual(['cat-gifts']);
    expect(list.active.find((r) => r.category.id === 'cat-groceries')!.movementCount).toBeGreaterThan(10);
  });

  it('says what uses a category, and allows deleting only an unused one', () => {
    const groceries = categoryUsage(data, 'cat-groceries');
    expect(groceries.budgets).toBe(1);
    expect(groceries.canDelete).toBe(false);
    const subscriptions = categoryUsage(data, 'cat-subscriptions');
    expect(subscriptions.subscriptions).toBeGreaterThan(0);
    expect(categoryUsage(data, 'cat-other').canDelete).toBe(true);
  });
});

describe('shared expenses', () => {
  it('sums what others owe and what the user owes, open balances first', () => {
    const overview = buildSharedOverview(data);
    expect(overview.owedToMeMinor).toBe(3000);
    expect(overview.iOweMinor).toBe(1200);
    expect(overview.people.map((p) => [p.person.name, p.balanceMinor])).toEqual([
      ['Mario', 3000],
      ['Giulia', -1200],
    ]);
  });

  it('shows a person with open items, history and whether it can be deleted', () => {
    const mario = buildPersonDetail(data, 'person-mario')!;
    expect(mario.balanceMinor).toBe(3000);
    expect(mario.open.map((i) => i.tx.description)).toEqual(['Cena con Mario']);
    expect(mario.settled).toEqual([]);
    expect(mario.canDelete).toBe(false);
  });
});
