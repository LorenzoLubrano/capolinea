import { totalBalance } from '@/domain/accounts';
import { incomeBetween } from '@/domain/breakdown';
import { compareWithPreviousMonth } from '@/domain/spending';
import { createDataset, PINNED_TODAY } from './seed';

describe('example dataset', () => {
  const data = createDataset();
  const opts = { currency: 'EUR', meId: data.meId };

  it('is identical on every launch', () => {
    expect(createDataset()).toEqual(data);
  });

  it('has no movement after the pinned today', () => {
    expect(data.transactions.every((t) => t.date <= PINNED_TODAY)).toBe(true);
  });

  it('puts nothing in the future on an earlier today, goal contributions included', () => {
    const early = createDataset('2026-10-01');
    expect(early.transactions.every((t) => t.date <= '2026-10-01')).toBe(true);
    expect(early.goals.every((g) => g.contributions.every((c) => c.date <= '2026-10-01'))).toBe(true);
  });

  it('gives October a plausible month: under budget, a bit under September at the same day', () => {
    const { currentMinor, change } = compareWithPreviousMonth(data.transactions, PINNED_TODAY, opts);
    expect(currentMinor).toBeGreaterThan(100000);
    expect(currentMinor).toBeLessThan(150000);
    expect(change).not.toBeNull();
    expect(change!).toBeLessThan(-0.03);
    expect(change!).toBeGreaterThan(-0.3);
  });

  it('has salary income in October and a positive total balance', () => {
    expect(incomeBetween(data.transactions, '2026-10-01', PINNED_TODAY, 'EUR')).toBe(175000);
    expect(totalBalance(data.accounts, data.transactions, 'EUR', data.meId).totalMinor).toBeGreaterThan(0);
  });

  it('includes generated subscription charges linked to their subscription', () => {
    const spotify = data.transactions.filter((t) => t.subscriptionId === 'sub-spotify');
    expect(spotify.map((t) => t.date)).toEqual(['2026-08-23', '2026-09-23', '2026-10-23']);
    expect(data.subscriptions.find((s) => s.id === 'sub-spotify')?.nextBillingDate).toBe('2026-11-23');
  });

  it('keeps split shares adding up to the amount', () => {
    for (const t of data.transactions.filter((t) => t.split)) {
      expect(t.split!.reduce((sum, s) => sum + s.amountMinor, 0)).toBe(t.amountMinor);
    }
  });
});
