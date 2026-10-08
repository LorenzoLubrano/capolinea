import { addMonthsClamped, dayOfMonth, daysInMonth, isWithin, monthEnd, monthStart } from './dates';
import { spendingBetween, spendingImpact, type SpendingOptions } from './spending';
import type { Budget, BudgetScope, CurrencyCode, Id, LocalDate, Transaction } from './types';

export type BudgetStatus = 'on_track' | 'ahead' | 'near' | 'over';

function monthLength(date: LocalDate): number {
  const [year, month] = date.split('-').map(Number);
  return daysInMonth(year, month);
}

/** Share of the month elapsed, today included: 24 October is 24/31. */
export function monthPace(today: LocalDate): number {
  return dayOfMonth(today) / monthLength(today);
}

export interface ForecastOptions {
  currency: CurrencyCode;
  meId: Id;
  /** Subscription and recurring charges still expected after today in this month. */
  upcomingRecurringMinor: number;
  /** Forecast one category only. */
  categoryId?: Id;
}

/**
 * Deterministic month-end forecast:
 * spent so far + recurring charges still expected + average daily variable spending × days left.
 * Recurring charges (rent, subscriptions) are not projected, so a big rent on day 1 does not inflate it.
 */
export function forecastMonthEnd(txs: Transaction[], today: LocalDate, options: ForecastOptions): number {
  const { currency, meId, upcomingRecurringMinor, categoryId } = options;
  const from = monthStart(today);
  let spent = 0;
  let variable = 0;

  for (const tx of txs) {
    if (tx.currency !== currency || !isWithin(tx.date, from, today)) continue;
    if (categoryId && tx.categoryId !== categoryId) continue;
    const impact = spendingImpact(tx, meId);
    spent += impact;
    if (!tx.isRecurring && !tx.subscriptionId) variable += impact;
  }

  const daysElapsed = dayOfMonth(today);
  const daysLeft = monthLength(today) - daysElapsed;
  return Math.round(spent + upcomingRecurringMinor + (variable / daysElapsed) * daysLeft);
}

export interface BudgetStatusInput {
  spentMinor: number;
  budgetMinor: number;
  pace: number;
  /** Share of the budget that triggers "near the limit"; 0.8 by default. */
  nearThreshold?: number;
}

const PACE_TOLERANCE = 0.05;

export function budgetStatus({ spentMinor, budgetMinor, pace, nearThreshold = 0.8 }: BudgetStatusInput): BudgetStatus {
  const used = spentMinor / budgetMinor;
  if (spentMinor > budgetMinor) return 'over';
  if (used >= nearThreshold) return 'near';
  if (used > pace + PACE_TOLERANCE) return 'ahead';
  return 'on_track';
}

/** The budget in force for a month (`YYYY-MM`): the latest one starting on or before it. */
export function activeBudget(budgets: Budget[], month: string, scope: BudgetScope, categoryId?: Id): Budget | undefined {
  return budgets
    .filter((b) => !b.deletedAt && b.scope === scope && (scope === 'global' || b.categoryId === categoryId) && b.fromMonth <= month)
    .sort((a, b) => b.fromMonth.localeCompare(a.fromMonth))[0];
}

export interface MonthSpending {
  /** First day of the month. */
  month: LocalDate;
  spentMinor: number;
}

/** Spending of the last `months` months, oldest first; the current month counts up to today. */
export function monthlyHistory(txs: Transaction[], today: LocalDate, months: number, options: SpendingOptions): MonthSpending[] {
  const current = monthStart(today);
  return Array.from({ length: months }, (_, i) => {
    const month = addMonthsClamped(current, i - (months - 1));
    const to = i === months - 1 ? today : monthEnd(month);
    return { month, spentMinor: spendingBetween(txs, month, to, options) };
  });
}

/**
 * Average of the full months before this one: the proposal for a new budget.
 * Months before the first recorded movement do not count, so a new user's empty past never drags it down.
 */
export function averageMonthlySpending(txs: Transaction[], today: LocalDate, months: number, options: SpendingOptions): number {
  const first = txs.reduce((min, t) => (!t.deletedAt && t.date < min ? t.date : min), today);
  const current = monthStart(today);
  let total = 0;
  let counted = 0;
  for (let i = 1; i <= months; i++) {
    const month = addMonthsClamped(current, -i);
    if (month < monthStart(first)) break;
    total += spendingBetween(txs, month, monthEnd(month), options);
    counted += 1;
  }
  return counted ? Math.round(total / counted) : 0;
}

/** What can be spent each day until the month ends, today included. Never negative. */
export function dailyAllowance(remainingMinor: number, today: LocalDate): number {
  if (remainingMinor <= 0) return 0;
  const daysLeft = monthLength(today) - dayOfMonth(today) + 1;
  return Math.floor(remainingMinor / daysLeft);
}

export type BudgetOutcome = 'kept' | 'over' | 'running' | 'none';

export interface BudgetMonth {
  /** First day of the month. */
  month: LocalDate;
  /** The global budget in force that month; null without one. */
  budgetMinor: number | null;
  spentMinor: number;
  outcome: BudgetOutcome;
}

export interface BudgetHistoryInput extends SpendingOptions {
  budgets: Budget[];
  transactions: Transaction[];
  /** The window ends with this date's month. */
  until: LocalDate;
  today: LocalDate;
  months: number;
}

/** Month by month, oldest first, whether the global budget held. Months before the first movement are left out. */
export function budgetHistory({ budgets, transactions, until, today, months, ...options }: BudgetHistoryInput): BudgetMonth[] {
  const first = transactions.reduce<LocalDate | null>((min, t) => (!t.deletedAt && (min === null || t.date < min) ? t.date : min), null);
  if (!first) return [];
  const last = monthStart(until < today ? until : today);
  const result: BudgetMonth[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = addMonthsClamped(last, -i);
    if (monthEnd(month) < first) continue;
    const running = month === monthStart(today);
    const spentMinor = spendingBetween(transactions, month, running ? today : monthEnd(month), options);
    const budget = activeBudget(budgets, month.slice(0, 7), 'global');
    const outcome: BudgetOutcome = !budget ? 'none' : running ? 'running' : spentMinor > budget.amountMinor ? 'over' : 'kept';
    result.push({ month, budgetMinor: budget?.amountMinor ?? null, spentMinor, outcome });
  }
  return result;
}
