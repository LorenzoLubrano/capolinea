import { isWithin, samePeriodPreviousMonth, monthStart } from './dates';
import type { CurrencyCode, Id, LocalDate, Transaction } from './types';

export interface SpendingOptions {
  currency: CurrencyCode;
  /** The app user's person id: split expenses count only this share. */
  meId: Id;
  categoryId?: Id;
}

/**
 * How much a transaction moves the user's spending, in minor units.
 * Expenses count (only the user's share when split), refunds subtract,
 * income, transfers and settlements never count.
 */
export function spendingImpact(tx: Transaction, meId: Id): number {
  if (tx.deletedAt || tx.settlementWith) return 0;
  if (tx.type === 'refund') return -tx.amountMinor;
  if (tx.type !== 'expense') return 0;
  if (!tx.split) return tx.amountMinor;
  return tx.split.find((share) => share.personId === meId)?.amountMinor ?? 0;
}

export function spendingBetween(
  txs: Transaction[],
  from: LocalDate,
  to: LocalDate,
  { currency, meId, categoryId }: SpendingOptions,
): number {
  return txs.reduce((sum, tx) => {
    if (tx.currency !== currency || !isWithin(tx.date, from, to)) return sum;
    if (categoryId && tx.categoryId !== categoryId) return sum;
    return sum + spendingImpact(tx, meId);
  }, 0);
}

export interface PeriodComparison {
  currentMinor: number;
  previousMinor: number;
  /** Relative change, e.g. -0.124 for 12.4% less; null when the previous period is empty. */
  change: number | null;
}

/** This month up to today against the same days of the previous month. */
export function compareWithPreviousMonth(
  txs: Transaction[],
  today: LocalDate,
  options: SpendingOptions,
): PeriodComparison {
  const previous = samePeriodPreviousMonth(today);
  const currentMinor = spendingBetween(txs, monthStart(today), today, options);
  const previousMinor = spendingBetween(txs, previous.from, previous.to, options);
  return {
    currentMinor,
    previousMinor,
    change: previousMinor === 0 ? null : (currentMinor - previousMinor) / previousMinor,
  };
}
