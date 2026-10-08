import type { Snapshot } from '@/data/repositories';
import { totalBalance } from '@/domain/accounts';
import { incomeBetween, monthlyEquivalent, spendingByCategory } from '@/domain/breakdown';
import { activeBudget, budgetStatus, forecastMonthEnd, monthPace, type BudgetStatus } from '@/domain/budget';
import { addDays, addMonthsClamped, monthEnd, monthStart } from '@/domain/dates';
import { compareWithPreviousMonth, spendingBetween } from '@/domain/spending';
import { chargesBetween } from '@/domain/subscriptions';
import type { Id, Transaction } from '@/domain/types';
import { it as strings } from '@/i18n/it';
import { monthName } from '@/services/format/dates';

export interface BandSegment {
  key: Id | 'other';
  name: string;
  /** Line colour key, resolved by the theme. */
  color: string;
  amountMinor: number;
  /** Width as a share of the band scale. */
  ratio: number;
}

export interface HomeSummary {
  currency: string;
  monthName: string;
  previousMonthName: string;
  spentMinor: number;
  comparison: { change: number | null };
  budget: {
    amountMinor: number;
    remainingMinor: number;
    forecastMinor: number;
    status: BudgetStatus;
  } | null;
  band: {
    segments: BandSegment[];
    /** Band end in minor units: the larger of budget, forecast and spending. */
    scaleMinor: number;
    /** Position of the budget terminus (capolinea). 1 when there is no budget. */
    terminusRatio: number;
    /** Where today says the spending should be. */
    paceRatio: number;
    forecastRatio: number;
  };
  balance: { totalMinor: number; accountCount: number };
  income: { incomeMinor: number; netMinor: number } | null;
  subscriptionsMonthlyMinor: number;
  lines: { categoryId: Id; name: string; color: string; spentMinor: number; budgetMinor?: number }[];
  latest: Transaction[];
}

const BAND_LINES = 6;
const TOP_LINES = 4;
const LATEST = 5;

export function buildHomeSummary(snapshot: Snapshot): HomeSummary {
  const { today, currency, meId, transactions, categories, budgets, subscriptions, accounts } = snapshot;
  const options = { currency, meId };
  const from = monthStart(today);
  const to = monthEnd(today);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const comparison = compareWithPreviousMonth(transactions, today, options);
  const spentMinor = comparison.currentMinor;

  const upcomingRecurringMinor = subscriptions
    .filter((s) => s.currency === currency)
    .reduce((sum, s) => sum + chargesBetween(s, addDays(today, 1), to).length * s.amountMinor, 0);
  const forecastMinor = forecastMonthEnd(transactions, today, { ...options, upcomingRecurringMinor });

  const month = today.slice(0, 7);
  const globalBudget = activeBudget(budgets, month, 'global');
  const pace = monthPace(today);
  const budget = globalBudget
    ? {
        amountMinor: globalBudget.amountMinor,
        remainingMinor: globalBudget.amountMinor - spentMinor,
        forecastMinor,
        status: budgetStatus({ spentMinor, budgetMinor: globalBudget.amountMinor, pace }),
      }
    : null;

  const byCategory = spendingByCategory(transactions, from, today, options);
  const scaleMinor = Math.max(globalBudget?.amountMinor ?? 0, forecastMinor, spentMinor, 1);
  const terminusRatio = globalBudget ? globalBudget.amountMinor / scaleMinor : 1;

  const head = byCategory.filter((c) => c.categoryId).slice(0, BAND_LINES);
  const headIds = new Set(head.map((c) => c.categoryId));
  const restMinor = byCategory.filter((c) => !headIds.has(c.categoryId)).reduce((sum, c) => sum + c.amountMinor, 0);
  const segments: BandSegment[] = head.map(({ categoryId, amountMinor }) => {
    const category = categoryById.get(categoryId!);
    return {
      key: categoryId!,
      name: category?.name ?? strings.categories.uncategorized,
      color: category?.color ?? 'grey',
      amountMinor,
      ratio: amountMinor / scaleMinor,
    };
  });
  if (restMinor > 0) {
    segments.push({ key: 'other', name: strings.categories.other, color: 'grey', amountMinor: restMinor, ratio: restMinor / scaleMinor });
  }

  const incomeMinor = incomeBetween(transactions, from, today, currency);
  const lines = head.slice(0, TOP_LINES).map(({ categoryId, amountMinor }) => {
    const category = categoryById.get(categoryId!);
    const categoryBudget = activeBudget(budgets, month, 'category', categoryId!);
    return {
      categoryId: categoryId!,
      name: category?.name ?? strings.categories.uncategorized,
      color: category?.color ?? 'grey',
      spentMinor: amountMinor,
      ...(categoryBudget ? { budgetMinor: categoryBudget.amountMinor } : {}),
    };
  });

  const latest = [...transactions]
    .filter((t) => !t.deletedAt && t.date <= today)
    .sort((a, b) => (a.date === b.date ? b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id) : b.date.localeCompare(a.date)))
    .slice(0, LATEST);

  return {
    currency,
    monthName: monthName(today),
    previousMonthName: monthName(addMonthsClamped(today, -1)),
    spentMinor,
    comparison: { change: comparison.change },
    budget,
    band: {
      segments,
      scaleMinor,
      terminusRatio,
      paceRatio: pace * terminusRatio,
      forecastRatio: forecastMinor / scaleMinor,
    },
    balance: totalBalance(accounts, transactions, currency, meId),
    income: incomeMinor > 0 ? { incomeMinor, netMinor: incomeMinor - spendingBetween(transactions, from, today, options) } : null,
    subscriptionsMonthlyMinor: subscriptions
      .filter((s) => s.active && s.currency === currency)
      .reduce((sum, s) => sum + monthlyEquivalent(s), 0),
    lines,
    latest,
  };
}
