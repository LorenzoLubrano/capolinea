import type {
  Account,
  AccountType,
  Budget,
  BudgetScope,
  Category,
  CategoryKind,
  FrequencyUnit,
  Goal,
  GoalContribution,
  Necessity,
  PaymentMethod,
  Person,
  RecordMeta,
  SplitShare,
  Subscription,
  Transaction,
  TransactionType,
} from '@/domain/types';

import type { SqlValue } from './database';

/**
 * Domain records to table rows and back. A record read back equals the one written: an absent
 * optional field is NULL in the row and has no key in the record.
 */

export type DbRow = Record<string, SqlValue>;

const bit = (value: boolean) => (value ? 1 : 0);
const text = (value: SqlValue) => value as string;
const int = (value: SqlValue) => value as number;
const flag = (value: SqlValue) => value === 1;
const maybe = <T>(value: SqlValue, read: (value: SqlValue) => T): T | undefined => (value === null ? undefined : read(value));

/** Drops the keys whose value is undefined. */
function compact<T>(record: Record<string, unknown>): T {
  for (const key of Object.keys(record)) if (record[key] === undefined) delete record[key];
  return record as T;
}

const metaRow = (record: RecordMeta): DbRow => ({
  id: record.id,
  created_at: record.createdAt,
  updated_at: record.updatedAt,
  deleted_at: record.deletedAt ?? null,
  owner_id: record.ownerId ?? null,
});

const readMeta = (row: DbRow) => ({
  id: text(row.id),
  createdAt: text(row.created_at),
  updatedAt: text(row.updated_at),
  deletedAt: maybe(row.deleted_at, text),
  ownerId: maybe(row.owner_id, text),
});

export const personRow = (p: Person): DbRow => ({ ...metaRow(p), name: p.name, is_me: bit(p.isMe) });

export const readPerson = (row: DbRow): Person => compact({ ...readMeta(row), name: text(row.name), isMe: flag(row.is_me) });

export const accountRow = (a: Account): DbRow => ({
  ...metaRow(a),
  name: a.name,
  type: a.type,
  currency: a.currency,
  opening_balance_minor: a.openingBalanceMinor,
  color: a.color,
  icon: a.icon ?? null,
  include_in_total: bit(a.includeInTotal),
  archived: bit(a.archived),
  sort_order: a.sortOrder,
});

export const readAccount = (row: DbRow): Account =>
  compact({
    ...readMeta(row),
    name: text(row.name),
    type: text(row.type) as AccountType,
    currency: text(row.currency),
    openingBalanceMinor: int(row.opening_balance_minor),
    color: text(row.color),
    icon: maybe(row.icon, text),
    includeInTotal: flag(row.include_in_total),
    archived: flag(row.archived),
    sortOrder: int(row.sort_order),
  });

export const categoryRow = (c: Category): DbRow => ({
  ...metaRow(c),
  name: c.name,
  kind: c.kind,
  icon: c.icon,
  color: c.color,
  parent_id: c.parentId ?? null,
  is_default: bit(c.isDefault),
  archived: bit(c.archived),
  sort_order: c.sortOrder,
});

export const readCategory = (row: DbRow): Category =>
  compact({
    ...readMeta(row),
    name: text(row.name),
    kind: text(row.kind) as CategoryKind,
    icon: text(row.icon),
    color: text(row.color),
    parentId: maybe(row.parent_id, text),
    isDefault: flag(row.is_default),
    archived: flag(row.archived),
    sortOrder: int(row.sort_order),
  });

export const subscriptionRow = (s: Subscription): DbRow => ({
  ...metaRow(s),
  name: s.name,
  amount_minor: s.amountMinor,
  currency: s.currency,
  frequency_unit: s.frequency.unit,
  frequency_interval: s.frequency.interval,
  anchor_date: s.anchorDate,
  next_billing_date: s.nextBillingDate,
  start_date: s.startDate,
  end_date: s.endDate ?? null,
  category_id: s.categoryId,
  account_id: s.accountId,
  notes: s.notes ?? null,
  active: bit(s.active),
});

export const readSubscription = (row: DbRow): Subscription =>
  compact({
    ...readMeta(row),
    name: text(row.name),
    amountMinor: int(row.amount_minor),
    currency: text(row.currency),
    frequency: { unit: text(row.frequency_unit) as FrequencyUnit, interval: int(row.frequency_interval) },
    anchorDate: text(row.anchor_date),
    nextBillingDate: text(row.next_billing_date),
    startDate: text(row.start_date),
    endDate: maybe(row.end_date, text),
    categoryId: text(row.category_id),
    accountId: text(row.account_id),
    notes: maybe(row.notes, text),
    active: flag(row.active),
  });

export const transactionRow = (t: Transaction): DbRow => ({
  ...metaRow(t),
  type: t.type,
  amount_minor: t.amountMinor,
  currency: t.currency,
  date: t.date,
  account_id: t.accountId,
  to_account_id: t.toAccountId ?? null,
  category_id: t.categoryId ?? null,
  subcategory_id: t.subcategoryId ?? null,
  merchant: t.merchant ?? null,
  description: t.description ?? null,
  notes: t.notes ?? null,
  tags: JSON.stringify(t.tags),
  payment_method: t.paymentMethod ?? null,
  receipt_uri: t.receiptUri ?? null,
  necessity: t.necessity ?? null,
  is_recurring: bit(t.isRecurring),
  subscription_id: t.subscriptionId ?? null,
  occurrence_date: t.occurrenceDate ?? null,
  edited_after_generation: t.editedAfterGeneration === undefined ? null : bit(t.editedAfterGeneration),
  refund_of_id: t.refundOfId ?? null,
  paid_by_person_id: t.paidByPersonId ?? null,
  split: t.split ? JSON.stringify(t.split) : null,
  settlement_with: t.settlementWith ?? null,
});

export const readTransaction = (row: DbRow): Transaction =>
  compact({
    ...readMeta(row),
    type: text(row.type) as TransactionType,
    amountMinor: int(row.amount_minor),
    currency: text(row.currency),
    date: text(row.date),
    accountId: text(row.account_id),
    toAccountId: maybe(row.to_account_id, text),
    categoryId: maybe(row.category_id, text),
    subcategoryId: maybe(row.subcategory_id, text),
    merchant: maybe(row.merchant, text),
    description: maybe(row.description, text),
    notes: maybe(row.notes, text),
    tags: JSON.parse(text(row.tags)) as string[],
    paymentMethod: maybe(row.payment_method, (v) => text(v) as PaymentMethod),
    receiptUri: maybe(row.receipt_uri, text),
    necessity: maybe(row.necessity, (v) => text(v) as Necessity),
    isRecurring: flag(row.is_recurring),
    subscriptionId: maybe(row.subscription_id, text),
    occurrenceDate: maybe(row.occurrence_date, text),
    editedAfterGeneration: maybe(row.edited_after_generation, flag),
    refundOfId: maybe(row.refund_of_id, text),
    paidByPersonId: maybe(row.paid_by_person_id, text),
    split: maybe(row.split, (v) => JSON.parse(text(v)) as SplitShare[]),
    settlementWith: maybe(row.settlement_with, text),
  });

export const budgetRow = (b: Budget): DbRow => ({
  ...metaRow(b),
  scope: b.scope,
  category_id: b.categoryId ?? null,
  amount_minor: b.amountMinor,
  currency: b.currency,
  from_month: b.fromMonth,
});

export const readBudget = (row: DbRow): Budget =>
  compact({
    ...readMeta(row),
    scope: text(row.scope) as BudgetScope,
    categoryId: maybe(row.category_id, text),
    amountMinor: int(row.amount_minor),
    currency: text(row.currency),
    fromMonth: text(row.from_month),
  });

/** The goal alone: its contributions live in their own table. */
export const goalRow = (g: Omit<Goal, 'contributions'>): DbRow => ({
  ...metaRow(g),
  name: g.name,
  icon: g.icon,
  color: g.color,
  target_minor: g.targetMinor,
  currency: g.currency,
  target_date: g.targetDate ?? null,
  account_id: g.accountId ?? null,
});

export const readGoal = (row: DbRow, contributions: GoalContribution[]): Goal =>
  compact({
    ...readMeta(row),
    name: text(row.name),
    icon: text(row.icon),
    color: text(row.color),
    targetMinor: int(row.target_minor),
    currency: text(row.currency),
    targetDate: maybe(row.target_date, text),
    accountId: maybe(row.account_id, text),
    contributions,
  });

export const contributionRow = (goalId: string, c: GoalContribution): DbRow => ({
  id: c.id,
  goal_id: goalId,
  date: c.date,
  amount_minor: c.amountMinor,
});

export const readContribution = (row: DbRow): GoalContribution => ({
  id: text(row.id),
  date: text(row.date),
  amountMinor: int(row.amount_minor),
});
