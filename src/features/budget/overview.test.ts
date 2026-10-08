import { createDataset } from '@/data/mock/seed';

import { buildBudgetOverview, buildCategoryDetail } from './overview';

const data = createDataset();

describe('buildBudgetOverview', () => {
  const overview = buildBudgetOverview(data);

  it('reads the global budget of the month with what is left per day', () => {
    expect(overview.global).not.toBeNull();
    const g = overview.global!;
    expect(g.amountMinor).toBe(160000);
    expect(g.remainingMinor).toBe(160000 - g.spentMinor);
    expect(g.perDayMinor).toBe(Math.floor(g.remainingMinor / 8));
    expect(overview.daysLeft).toBe(8);
  });

  it('lists category budgets, the most used first', () => {
    expect(overview.categories).toHaveLength(5);
    const ratios = overview.categories.map((c) => c.ratio);
    expect([...ratios].sort((a, b) => b - a)).toEqual(ratios);
  });

  it('suggests categories with spending but no budget, biggest first', () => {
    const budgeted = new Set(overview.categories.map((c) => c.categoryId));
    expect(overview.withoutBudget.length).toBeLessThanOrEqual(4);
    expect(overview.withoutBudget.every((c) => !budgeted.has(c.categoryId))).toBe(true);
    const spent = overview.withoutBudget.map((c) => c.spentMinor);
    expect([...spent].sort((a, b) => b - a)).toEqual(spent);
  });

  it('proposes the average of the last three months', () => {
    expect(overview.proposalMinor).toBeGreaterThan(0);
  });
});

describe('buildCategoryDetail', () => {
  it('gives budget, history and this month movements of a category', () => {
    const detail = buildCategoryDetail(data, 'cat-groceries');
    expect(detail.budgetMinor).toBe(35000);
    expect(detail.history).toHaveLength(6);
    expect(detail.history[5].spentMinor).toBe(detail.spentMinor);
    expect(detail.movements.every((t) => t.categoryId === 'cat-groceries' && t.date >= '2026-10-01')).toBe(true);
    expect(detail.forecastMinor).toBeGreaterThanOrEqual(detail.spentMinor);
  });

  it('works for a category without budget', () => {
    expect(buildCategoryDetail(data, 'cat-home').budgetMinor).toBeNull();
  });
});
