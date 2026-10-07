import type { Snapshot } from '@/data/repositories';
import { addDays } from '@/domain/dates';
import type { Category, Id, Transaction } from '@/domain/types';

const WINDOW_DAYS = 90;

function recentExpenses({ transactions, today }: Snapshot): Transaction[] {
  const from = addDays(today, -WINDOW_DAYS);
  return transactions.filter((t) => t.type === 'expense' && !t.deletedAt && t.date >= from && t.date <= today);
}

const newestFirst = (a: Transaction, b: Transaction) =>
  a.date === b.date ? b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id) : b.date.localeCompare(a.date);

/** Expense categories by use in the last 90 days, then the default order, so the chips are always full. */
export function frequentCategories(snapshot: Snapshot, count: number): Category[] {
  const uses = new Map<Id, number>();
  for (const t of recentExpenses(snapshot)) {
    if (t.categoryId) uses.set(t.categoryId, (uses.get(t.categoryId) ?? 0) + 1);
  }
  return snapshot.categories
    .filter((c) => c.kind === 'expense' && !c.archived && !c.parentId)
    .sort((a, b) => (uses.get(b.id) ?? 0) - (uses.get(a.id) ?? 0) || a.sortOrder - b.sortOrder)
    .slice(0, count);
}

/** The account of the latest expense: people pay with the same card most of the time. */
export function defaultAccountId(snapshot: Snapshot): Id {
  const latest = [...recentExpenses(snapshot)].sort(newestFirst)[0];
  return latest?.accountId ?? [...snapshot.accounts].sort((a, b) => a.sortOrder - b.sortOrder)[0].id;
}

export interface ExpenseTemplate {
  merchant: string;
  amountMinor: number;
  categoryId: Id;
  accountId: Id;
}

/** Habits to repeat with one tap: most frequent merchants, with their latest amount, category and account. */
export function recentTemplates(snapshot: Snapshot, count: number): ExpenseTemplate[] {
  const groups = new Map<string, Transaction[]>();
  for (const t of recentExpenses(snapshot)) {
    if (!t.merchant || !t.categoryId || t.isRecurring || t.subscriptionId) continue;
    groups.set(t.merchant, [...(groups.get(t.merchant) ?? []), t]);
  }
  return [...groups.values()]
    .map((list) => list.sort(newestFirst))
    .sort((a, b) => b.length - a.length || newestFirst(a[0], b[0]))
    .slice(0, count)
    .map(([latest]) => ({
      merchant: latest.merchant!,
      amountMinor: latest.amountMinor,
      categoryId: latest.categoryId!,
      accountId: latest.accountId,
    }));
}
