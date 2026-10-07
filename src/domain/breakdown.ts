import { isWithin } from './dates';
import { spendingImpact, type SpendingOptions } from './spending';
import type { CurrencyCode, Id, LocalDate, Subscription, Transaction } from './types';

export interface CategorySpending {
  categoryId: Id | null;
  amountMinor: number;
}

/** Spending per category in the range, largest first. Categories that net to zero or less are dropped. */
export function spendingByCategory(
  txs: Transaction[],
  from: LocalDate,
  to: LocalDate,
  { currency, meId }: Omit<SpendingOptions, 'categoryId'>,
): CategorySpending[] {
  const totals = new Map<Id | null, number>();
  for (const tx of txs) {
    if (tx.currency !== currency || !isWithin(tx.date, from, to)) continue;
    const impact = spendingImpact(tx, meId);
    if (impact === 0) continue;
    const key = tx.categoryId ?? null;
    totals.set(key, (totals.get(key) ?? 0) + impact);
  }
  return [...totals.entries()]
    .map(([categoryId, amountMinor]) => ({ categoryId, amountMinor }))
    .filter((entry) => entry.amountMinor > 0)
    .sort((a, b) => b.amountMinor - a.amountMinor);
}

export function incomeBetween(txs: Transaction[], from: LocalDate, to: LocalDate, currency: CurrencyCode): number {
  return txs.reduce(
    (sum, tx) =>
      !tx.deletedAt && tx.type === 'income' && tx.currency === currency && isWithin(tx.date, from, to)
        ? sum + tx.amountMinor
        : sum,
    0,
  );
}

const WEEKS_PER_MONTH = 365.25 / 7 / 12;

/** Monthly cost of a subscription whatever its frequency, rounded to the cent. */
export function monthlyEquivalent(subscription: Subscription): number {
  const { amountMinor, frequency } = subscription;
  const perUnit = amountMinor / frequency.interval;
  switch (frequency.unit) {
    case 'week':
      return Math.round(perUnit * WEEKS_PER_MONTH);
    case 'month':
      return Math.round(perUnit);
    case 'year':
      return Math.round(perUnit / 12);
  }
}

/** What a subscription costs in a year, whatever its frequency. */
export function yearlyEquivalent(subscription: Subscription): number {
  const { amountMinor, frequency } = subscription;
  const perUnit = amountMinor / frequency.interval;
  switch (frequency.unit) {
    case 'week':
      return Math.round(perUnit * WEEKS_PER_MONTH * 12);
    case 'month':
      return Math.round(perUnit * 12);
    case 'year':
      return Math.round(perUnit);
  }
}
