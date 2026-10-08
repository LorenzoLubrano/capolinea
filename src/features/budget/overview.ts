import type { Snapshot } from '@/data/repositories';
import { spendingByCategory } from '@/domain/breakdown';
import {
  activeBudget,
  averageMonthlySpending,
  budgetStatus,
  dailyAllowance,
  forecastMonthEnd,
  monthlyHistory,
  monthPace,
  type BudgetStatus,
  type MonthSpending,
} from '@/domain/budget';
import { addDays, dayOfMonth, daysInMonth, monthEnd, monthStart } from '@/domain/dates';
import { spendingBetween } from '@/domain/spending';
import { chargesBetween } from '@/domain/subscriptions';
import type { Id, Transaction } from '@/domain/types';

export interface CategoryBudgetRow {
  categoryId: Id;
  budgetId: Id;
  name: string;
  color: string;
  budgetMinor: number;
  /** Never below zero: a month that gave back more than it took has spent nothing. */
  spentMinor: number;
  /** Refunds beyond the month's spending in the category, 0 otherwise. */
  refundedMinor: number;
  ratio: number;
  status: BudgetStatus;
}

export interface BudgetOverview {
  pace: number;
  daysLeft: number;
  global: {
    budgetId: Id;
    amountMinor: number;
    spentMinor: number;
    remainingMinor: number;
    perDayMinor: number;
    forecastMinor: number;
    ratio: number;
    status: BudgetStatus;
  } | null;
  /** Average of the last three full months: the proposal for a missing global budget. */
  proposalMinor: number;
  categories: CategoryBudgetRow[];
  withoutBudget: { categoryId: Id; name: string; color: string; spentMinor: number }[];
}

const SUGGESTIONS = 4;
const PROPOSAL_MONTHS = 3;
const HISTORY_MONTHS = 6;

/** Subscription charges still due after today in this month, optionally for one category. */
export function upcomingRecurring(snapshot: Snapshot, categoryId?: Id): number {
  const { subscriptions, today, currency } = snapshot;
  return subscriptions
    .filter((s) => s.currency === currency && (!categoryId || s.categoryId === categoryId))
    .reduce((sum, s) => sum + chargesBetween(s, addDays(today, 1), monthEnd(today)).length * s.amountMinor, 0);
}

export function buildBudgetOverview(snapshot: Snapshot): BudgetOverview {
  const { today, currency, meId, transactions, budgets, categories } = snapshot;
  const month = today.slice(0, 7);
  const options = { currency, meId };
  const from = monthStart(today);
  const pace = monthPace(today);
  const [year, monthNumber] = today.split('-').map(Number);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const spentMinor = spendingBetween(transactions, from, today, options);
  const globalBudget = activeBudget(budgets, month, 'global');
  const global = globalBudget
    ? {
        budgetId: globalBudget.id,
        amountMinor: globalBudget.amountMinor,
        spentMinor,
        remainingMinor: globalBudget.amountMinor - spentMinor,
        perDayMinor: dailyAllowance(globalBudget.amountMinor - spentMinor, today),
        forecastMinor: forecastMonthEnd(transactions, today, { ...options, upcomingRecurringMinor: upcomingRecurring(snapshot) }),
        ratio: spentMinor / globalBudget.amountMinor,
        status: budgetStatus({ spentMinor, budgetMinor: globalBudget.amountMinor, pace }),
      }
    : null;

  const categoryRows: CategoryBudgetRow[] = [];
  for (const category of categories) {
    const budget = category.kind === 'expense' ? activeBudget(budgets, month, 'category', category.id) : undefined;
    if (!budget) continue;
    const net = spendingBetween(transactions, from, today, { ...options, categoryId: category.id });
    const spent = Math.max(net, 0);
    categoryRows.push({
      categoryId: category.id,
      budgetId: budget.id,
      name: category.name,
      color: category.color,
      budgetMinor: budget.amountMinor,
      spentMinor: spent,
      refundedMinor: Math.max(-net, 0),
      ratio: spent / budget.amountMinor,
      status: budgetStatus({ spentMinor: spent, budgetMinor: budget.amountMinor, pace }),
    });
  }
  categoryRows.sort((a, b) => b.ratio - a.ratio);
  const budgeted = new Set(categoryRows.map((c) => c.categoryId));

  const withoutBudget = spendingByCategory(transactions, from, today, options)
    .filter((c) => c.categoryId && !budgeted.has(c.categoryId))
    .slice(0, SUGGESTIONS)
    .map(({ categoryId, amountMinor }) => {
      const category = categoryById.get(categoryId!);
      return { categoryId: categoryId!, name: category?.name ?? '', color: category?.color ?? 'grey', spentMinor: amountMinor };
    });

  return {
    pace,
    daysLeft: daysInMonth(year, monthNumber) - dayOfMonth(today) + 1,
    global,
    proposalMinor: averageMonthlySpending(transactions, today, PROPOSAL_MONTHS, options),
    categories: categoryRows,
    withoutBudget,
  };
}

export interface CategoryDetail {
  budgetId: Id | null;
  budgetMinor: number | null;
  /** Never below zero, as in the overview. */
  spentMinor: number;
  refundedMinor: number;
  forecastMinor: number;
  perDayMinor: number | null;
  status: BudgetStatus | null;
  pace: number;
  history: MonthSpending[];
  movements: Transaction[];
}

export function buildCategoryDetail(snapshot: Snapshot, categoryId: Id): CategoryDetail {
  const { today, currency, meId, transactions, budgets } = snapshot;
  const options = { currency, meId, categoryId };
  const from = monthStart(today);
  const pace = monthPace(today);
  const budget = activeBudget(budgets, today.slice(0, 7), 'category', categoryId);
  const net = spendingBetween(transactions, from, today, options);
  const spentMinor = Math.max(net, 0);

  return {
    budgetId: budget?.id ?? null,
    budgetMinor: budget?.amountMinor ?? null,
    spentMinor,
    refundedMinor: Math.max(-net, 0),
    forecastMinor: forecastMonthEnd(transactions, today, { ...options, upcomingRecurringMinor: upcomingRecurring(snapshot, categoryId) }),
    perDayMinor: budget ? dailyAllowance(budget.amountMinor - spentMinor, today) : null,
    status: budget ? budgetStatus({ spentMinor, budgetMinor: budget.amountMinor, pace }) : null,
    pace,
    history: monthlyHistory(transactions, today, HISTORY_MONTHS, options),
    movements: transactions
      .filter((t) => t.categoryId === categoryId && t.date >= from && t.date <= today)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
  };
}

/** Proposal for a category budget: the category's average of the last three full months. */
export function categoryProposal(snapshot: Snapshot, categoryId: Id): number {
  return averageMonthlySpending(snapshot.transactions, snapshot.today, PROPOSAL_MONTHS, {
    currency: snapshot.currency,
    meId: snapshot.meId,
    categoryId,
  });
}
