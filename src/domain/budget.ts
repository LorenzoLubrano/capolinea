import { dayOfMonth, daysInMonth, isWithin, monthStart } from './dates';
import { spendingImpact } from './spending';
import type { CurrencyCode, Id, LocalDate, Transaction } from './types';

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
}

/**
 * Deterministic month-end forecast:
 * spent so far + recurring charges still expected + average daily variable spending × days left.
 * Recurring charges (rent, subscriptions) are not projected, so a big rent on day 1 does not inflate it.
 */
export function forecastMonthEnd(txs: Transaction[], today: LocalDate, options: ForecastOptions): number {
  const { currency, meId, upcomingRecurringMinor } = options;
  const from = monthStart(today);
  let spent = 0;
  let variable = 0;

  for (const tx of txs) {
    if (tx.currency !== currency || !isWithin(tx.date, from, today)) continue;
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
