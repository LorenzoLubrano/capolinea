import { addMonthsClamped, isWithin, monthEnd, monthStart } from '@/domain/dates';
import { spendingImpact } from '@/domain/spending';
import type { Id, LocalDate, Transaction } from '@/domain/types';

export type KindFilter = 'all' | 'expense' | 'income' | 'transfer';
export type PeriodFilter = 'all' | 'month' | 'last-month' | '3-months';
export type SortOrder = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

/** An exact span from elsewhere (Analisi): it wins over the period while set. */
export interface DateRange {
  from: LocalDate;
  to: LocalDate;
  label: string;
}

export interface Filters {
  kind: KindFilter;
  period: PeriodFilter;
  range: DateRange | null;
  categoryIds: Id[];
  accountIds: Id[];
  sort: SortOrder;
}

export const DEFAULT_FILTERS: Filters = { kind: 'all', period: 'all', range: null, categoryIds: [], accountIds: [], sort: 'date-desc' };

function periodRange(period: PeriodFilter, today: LocalDate): { from: LocalDate; to: LocalDate } | null {
  switch (period) {
    case 'month':
      return { from: monthStart(today), to: today };
    case 'last-month': {
      const previous = addMonthsClamped(monthStart(today), -1);
      return { from: previous, to: monthEnd(previous) };
    }
    case '3-months':
      return { from: addMonthsClamped(monthStart(today), -2), to: today };
    default:
      return null;
  }
}

/** Refunds bring money in, so they sit with income here; they still reduce spending in totals. */
function kindOf(tx: Transaction): Exclude<KindFilter, 'all'> {
  if (tx.type === 'transfer') return 'transfer';
  return tx.type === 'expense' ? 'expense' : 'income';
}

export function applyFilters(transactions: Transaction[], filters: Filters, today: LocalDate): Transaction[] {
  const range = filters.range ?? periodRange(filters.period, today);
  return transactions.filter(
    (tx) =>
      (filters.kind === 'all' || kindOf(tx) === filters.kind) &&
      (!range || isWithin(tx.date, range.from, range.to)) &&
      (filters.categoryIds.length === 0 ||
        filters.categoryIds.some((id) => id === tx.categoryId || id === tx.subcategoryId)) &&
      (filters.accountIds.length === 0 || filters.accountIds.some((id) => id === tx.accountId || id === tx.toAccountId)),
  );
}

const newestFirst = (a: Transaction, b: Transaction) =>
  b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

export function sortTransactions(transactions: Transaction[], sort: SortOrder): Transaction[] {
  const sorted = [...transactions];
  switch (sort) {
    case 'date-asc':
      return sorted.sort((a, b) => -newestFirst(a, b));
    case 'amount-desc':
      return sorted.sort((a, b) => b.amountMinor - a.amountMinor || newestFirst(a, b));
    case 'amount-asc':
      return sorted.sort((a, b) => a.amountMinor - b.amountMinor || newestFirst(a, b));
    default:
      return sorted.sort(newestFirst);
  }
}

export interface DaySection {
  date: LocalDate;
  /** What the day added to spending: my share of expenses, minus refunds. */
  totalMinor: number;
  data: Transaction[];
}

/** Days newest first; within a day the most recently added on top. */
export function groupByDay(transactions: Transaction[], meId: Id): DaySection[] {
  const days = new Map<LocalDate, Transaction[]>();
  for (const tx of sortTransactions(transactions, 'date-desc')) {
    const day = days.get(tx.date);
    if (day) day.push(tx);
    else days.set(tx.date, [tx]);
  }
  return [...days].map(([date, data]) => ({
    date,
    data,
    totalMinor: data.reduce((sum, tx) => sum + spendingImpact(tx, meId), 0),
  }));
}

/** Filters set in the filter sheet (the kind has its own chips on the list). */
export function activeFilterCount(filters: Filters): number {
  return (
    Number(filters.period !== DEFAULT_FILTERS.period || filters.range !== null) +
    Number(filters.categoryIds.length > 0) +
    Number(filters.accountIds.length > 0) +
    Number(filters.sort !== DEFAULT_FILTERS.sort)
  );
}
