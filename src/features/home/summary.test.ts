import { createDataset } from '@/data/mock/seed';
import { compareWithPreviousMonth } from '@/domain/spending';
import { tx } from '@/domain/testing/builders';

import { buildHomeSummary } from './summary';

describe('buildHomeSummary', () => {
  const data = createDataset();
  const summary = buildHomeSummary(data);

  it('reads the budget status from the forecast: the rent of the first is no alarm', () => {
    expect(buildHomeSummary(createDataset('2026-10-01')).budget?.status).toBe('on_track');
    expect(summary.budget?.status).toBe(summary.budget!.forecastMinor >= 0.95 * summary.budget!.amountMinor ? 'near' : 'on_track');
  });

  it('gives each line with a budget its own status, from its own forecast', () => {
    const withBudget = summary.lines.filter((l) => l.budgetMinor);
    expect(withBudget.length).toBeGreaterThan(0);
    expect(withBudget.every((l) => l.status)).toBe(true);
    expect(summary.lines.filter((l) => !l.budgetMinor).every((l) => l.status === undefined)).toBe(true);
  });

  it('reports the month spending and the comparison at the same day', () => {
    const comparison = compareWithPreviousMonth(data.transactions, data.today, { currency: 'EUR', meId: data.meId });
    expect(summary.spentMinor).toBe(comparison.currentMinor);
    expect(summary.comparison.change).toBeCloseTo(comparison.change!);
    expect(summary.monthName).toBe('ottobre');
    expect(summary.previousMonthName).toBe('settembre');
  });

  it('builds a band of at most six lines plus Altro that adds up to the spending', () => {
    const { band } = summary;
    expect(band.segments.length).toBeLessThanOrEqual(7);
    expect(band.segments.reduce((sum, s) => sum + s.amountMinor, 0)).toBe(summary.spentMinor);
    expect(band.segments[band.segments.length - 1].key).toBe('other');
    expect(band.terminusRatio).toBeGreaterThan(0);
    expect(band.terminusRatio).toBeLessThanOrEqual(1);
  });

  it('places today and the forecast on the band scale', () => {
    const { band, budget } = summary;
    expect(budget).not.toBeNull();
    expect(band.paceRatio).toBeCloseTo((24 / 31) * band.terminusRatio);
    expect(band.forecastRatio).toBeCloseTo(budget!.forecastMinor / band.scaleMinor);
  });

  it('lists the four largest lines with their budgets', () => {
    expect(summary.lines).toHaveLength(4);
    expect(summary.lines[0].spentMinor).toBeGreaterThanOrEqual(summary.lines[1].spentMinor);
    const groceries = summary.lines.find((l) => l.categoryId === 'cat-groceries');
    expect(groceries?.budgetMinor).toBe(35000);
  });

  it('shows the five newest movements first', () => {
    expect(summary.latest).toHaveLength(5);
    const dates = summary.latest.map((t) => t.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(dates[0]).toBe(data.today);
  });

  it('omits income metrics when no income was recorded this month', () => {
    const noIncome = { ...data, transactions: data.transactions.filter((t) => t.type !== 'income') };
    expect(buildHomeSummary(noIncome).income).toBeNull();
    expect(summary.income?.incomeMinor).toBe(175000);
  });

  it('works on a first launch with no movements', () => {
    const empty = buildHomeSummary({ ...data, transactions: [] });
    expect(empty.spentMinor).toBe(0);
    expect(empty.band.segments).toEqual([]);
    expect(empty.latest).toEqual([]);
    expect(empty.comparison.change).toBeNull();
  });

  it('still answers when there is no global budget', () => {
    const noBudget = buildHomeSummary({ ...data, budgets: [], transactions: [tx({ date: '2026-10-20', amountMinor: 5000 })] });
    expect(noBudget.budget).toBeNull();
    expect(noBudget.band.terminusRatio).toBe(1);
  });
});
