import { createDataset } from '@/data/mock/seed';
import { createEdgeDataset } from '@/data/mock/variants';

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

  it('reads every status from the forecast, never from a straight-line pace', () => {
    const early = buildBudgetOverview(createDataset('2026-10-01'));
    expect(early.global?.status).toBe('on_track');
    expect(early.categories.every((c) => c.status === 'on_track')).toBe(true);
  });

  it('gives each category its forecast, which its status agrees with', () => {
    for (const c of overview.categories) {
      expect(c.forecastMinor).toBeGreaterThanOrEqual(c.spentMinor);
      if (c.status === 'trending_over') expect(c.forecastMinor).toBeGreaterThan(c.budgetMinor);
      if (c.status === 'on_track') expect(c.forecastMinor).toBeLessThan(c.budgetMinor * 0.95);
    }
  });

  it('suggests categories with spending but no budget, biggest first', () => {
    const budgeted = new Set(overview.categories.map((c) => c.categoryId));
    expect(overview.withoutBudget.length).toBeLessThanOrEqual(4);
    expect(overview.withoutBudget.every((c) => !budgeted.has(c.categoryId))).toBe(true);
    const spent = overview.withoutBudget.map((c) => c.spentMinor);
    expect([...spent].sort((a, b) => b - a)).toEqual(spent);
  });

  it('never shows negative spending: refunds beyond the spending are told apart', () => {
    const travel = buildBudgetOverview(createEdgeDataset('2026-10-24')).categories.find((c) => c.categoryId === 'cat-travel')!;
    expect(travel.spentMinor).toBe(0);
    expect(travel.refundedMinor).toBe(32000);
    expect(travel.ratio).toBe(0);
    expect(travel.status).toBe('on_track');
    expect(overview.categories.every((c) => c.refundedMinor === 0)).toBe(true);
  });

  it('proposes the average of the last three months', () => {
    expect(overview.proposalMinor).toBeGreaterThan(0);
  });
});

describe('buildCategoryDetail', () => {
  it('never shows negative spending in a category that got more back than it spent', () => {
    const detail = buildCategoryDetail(createEdgeDataset('2026-10-24'), 'cat-travel');
    expect(detail.spentMinor).toBe(0);
    expect(detail.refundedMinor).toBe(32000);
  });

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
