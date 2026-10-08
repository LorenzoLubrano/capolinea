import { createDataset } from '@/data/mock/seed';
import { spendingBetween } from '@/domain/spending';

import { buildAnalysis, buildCategoryAnalysis, buildMerchantAnalysis } from './analysis';

const data = createDataset();
const options = { currency: data.currency, meId: data.meId };
const spent = (from: string, to: string) => spendingBetween(data.transactions, from, to, options);

describe('buildAnalysis: month', () => {
  const analysis = buildAnalysis(data, 'month', 0);

  it('analyses the current month up to today', () => {
    expect(analysis.period).toEqual({ unit: 'month', from: '2026-10-01', to: '2026-10-31' });
    expect(analysis.current).toBe(true);
    expect(analysis.canGoForward).toBe(false);
    expect(analysis.canGoBack).toBe(true);
    expect(analysis.totalMinor).toBe(spent('2026-10-01', '2026-10-24'));
  });

  it('compares with the same days of the previous months', () => {
    const usual = Math.round((spent('2026-09-01', '2026-09-24') + spent('2026-08-01', '2026-08-24')) / 2);
    expect(analysis.comparison).toEqual({ usualMinor: usual, change: (analysis.totalMinor - usual) / usual });
  });

  it('draws the months with data, the usual of the full ones and the forecast on this month', () => {
    const { trend } = analysis;
    // Months before the first movement have no data, not zero spending: they are left out.
    expect(trend.buckets.map((b) => b.from)).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
    expect(trend.emphasis).toBe('last');
    expect(trend.selectedIndex).toBe(2);
    expect(trend.usualMinor).toBe(Math.round((spent('2026-08-01', '2026-08-31') + spent('2026-09-01', '2026-09-30')) / 2));
    expect(trend.forecast?.index).toBe(2);
    expect(trend.forecast!.amountMinor).toBeGreaterThan(analysis.totalMinor);
  });

  it('ranks categories with their share of the spending', () => {
    const amounts = analysis.categories.map((c) => c.spentMinor);
    expect([...amounts].sort((a, b) => b - a)).toEqual(amounts);
    expect(analysis.categories[0].share).toBeCloseTo(amounts[0] / analysis.totalMinor);
    expect(analysis.categories.every((c) => c.name.length > 0)).toBe(true);
  });

  it('reads day habits on variable spending only', () => {
    expect(analysis.days.buckets).toHaveLength(31);
    expect(analysis.days.habits.pastDays).toBe(24);
    // Rent on the 1st is fixed: it is not part of the day habits.
    expect(analysis.days.buckets[0].spentMinor).toBeLessThan(55000);
    expect(analysis.days.peak?.spentMinor).toBe(Math.max(...analysis.days.buckets.map((b) => b.spentMinor)));
  });

  it('lists the biggest variable expenses and the merchants', () => {
    expect(analysis.largest.length).toBeLessThanOrEqual(5);
    expect(analysis.largest.every(({ tx }) => !tx.isRecurring && !tx.subscriptionId)).toBe(true);
    expect(analysis.merchants[0].spentMinor).toBeGreaterThanOrEqual(analysis.merchants[1].spentMinor);
  });

  it('weighs the subscriptions against the spending of the period', () => {
    const { subscriptions } = analysis;
    expect(subscriptions.activeCount).toBeGreaterThan(0);
    expect(subscriptions.periodMinor).toBe(spendingBetween(data.transactions.filter((t) => t.subscriptionId), '2026-10-01', '2026-10-24', options));
    expect(subscriptions.share).toBeCloseTo(subscriptions.periodMinor / analysis.totalMinor);
  });

  it('reports the budget of each month since the data starts', () => {
    expect(analysis.budgets.map((b) => b.month)).toEqual(['2026-08-01', '2026-09-01', '2026-10-01']);
    expect(analysis.budgets[2].outcome).toBe('running');
  });
});

describe('buildAnalysis: other periods', () => {
  it('stops going back at the month of the first movement', () => {
    const august = buildAnalysis(data, 'month', -2);
    expect(august.period.from).toBe('2026-08-01');
    expect(august.canGoBack).toBe(false);
    expect(august.canGoForward).toBe(true);
    expect(august.comparison).toBeNull();
  });

  it('shows a past month whole, without a forecast', () => {
    const september = buildAnalysis(data, 'month', -1);
    expect(september.current).toBe(false);
    expect(september.totalMinor).toBe(spent('2026-09-01', '2026-09-30'));
    expect(september.trend.forecast).toBeNull();
  });

  it('draws the months of the year, later ones as future', () => {
    const year = buildAnalysis(data, 'year', 0);
    expect(year.trend.buckets).toHaveLength(12);
    expect(year.trend.emphasis).toBe('all');
    expect(year.trend.selectedIndex).toBe(9);
    expect(year.trend.buckets.slice(10).every((b) => b.future)).toBe(true);
    expect(year.comparison).toBeNull();
    expect(year.days.buckets).toHaveLength(365);
  });

  it('draws six weeks for a week', () => {
    const week = buildAnalysis(data, 'week', 0);
    expect(week.period).toEqual({ unit: 'week', from: '2026-10-19', to: '2026-10-25' });
    expect(week.trend.buckets.map((b) => b.from)).toEqual(['2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19']);
    expect(week.trend.forecast).toBeNull();
    expect(week.days.buckets).toHaveLength(7);
  });
});

describe('buildCategoryAnalysis', () => {
  const groceries = buildCategoryAnalysis(data, 'month', 0, 'cat-groceries');

  it('totals the category and its share of the month', () => {
    const total = spendingBetween(data.transactions, '2026-10-01', '2026-10-24', { ...options, categoryId: 'cat-groceries' });
    expect(groceries.totalMinor).toBe(total);
    expect(groceries.share).toBeCloseTo(total / spent('2026-10-01', '2026-10-24'));
    expect(groceries.trend.buckets).toHaveLength(3);
  });

  it('lists only its merchants and the movements of the period, newest first', () => {
    expect(groceries.merchants.map((m) => m.name).sort()).toEqual(['Esselunga', 'Lidl']);
    expect(groceries.movements.every((t) => t.categoryId === 'cat-groceries' && t.date >= '2026-10-01' && t.date <= '2026-10-24')).toBe(true);
    const dates = groceries.movements.map((t) => t.date);
    expect([...dates].sort().reverse()).toEqual(dates);
  });
});

describe('buildMerchantAnalysis', () => {
  it('finds a merchant whatever the case and sums the period and all time', () => {
    const esselunga = buildMerchantAnalysis(data, 'month', 0, 'esselunga');
    const all = data.transactions.filter((t) => t.merchant === 'Esselunga' && !t.deletedAt);
    const inPeriod = all.filter((t) => t.date >= '2026-10-01' && t.date <= '2026-10-24');
    expect(esselunga.name).toBe('Esselunga');
    expect(esselunga.categoryId).toBe('cat-groceries');
    expect(esselunga.count).toBe(inPeriod.length);
    expect(esselunga.totalMinor).toBe(inPeriod.reduce((sum, t) => sum + t.amountMinor, 0));
    expect(esselunga.averageMinor).toBe(Math.round(esselunga.totalMinor / esselunga.count));
    expect(esselunga.allTime.count).toBe(all.length);
    expect(esselunga.allTime.since).toBe(all.map((t) => t.date).sort()[0]);
    expect(esselunga.movements).toHaveLength(inPeriod.length);
  });

  it('nets refunds into the merchant total', () => {
    const amazon = buildMerchantAnalysis(data, 'month', -1, 'Amazon');
    const september = data.transactions.filter((t) => t.merchant === 'Amazon' && t.date.startsWith('2026-09'));
    expect(amazon.totalMinor).toBe(september.reduce((sum, t) => sum + (t.type === 'refund' ? -t.amountMinor : t.amountMinor), 0));
  });
});
