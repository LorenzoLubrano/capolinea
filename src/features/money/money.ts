import type { Snapshot } from '@/data/repositories';
import { accountBalance, accountFlows } from '@/domain/accounts';
import { monthStart } from '@/domain/dates';
import { balancesByPerson, openItems } from '@/domain/splits';
import type { Account, Category, CategoryKind, Id, Person, Transaction } from '@/domain/types';

const LATEST = 20;
const HISTORY = 20;

const byOrder = <T extends { sortOrder: number }>(a: T, b: T) => a.sortOrder - b.sortOrder;
const byNewest = (a: Transaction, b: Transaction) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
const touches = (tx: Transaction, accountId: Id) => tx.accountId === accountId || tx.toAccountId === accountId;

export interface AccountRow {
  account: Account;
  balanceMinor: number;
}

/** Conti: accounts in the total, the others, the archived ones, and the total. */
export function buildAccountsOverview(snapshot: Snapshot) {
  const rows = [...snapshot.accounts].sort(byOrder).map((account) => ({ account, balanceMinor: accountBalance(account, snapshot.transactions, snapshot.meId) }));
  const included = rows.filter((r) => !r.account.archived && r.account.includeInTotal && r.account.currency === snapshot.currency);
  return {
    totalMinor: included.reduce((sum, r) => sum + r.balanceMinor, 0),
    included,
    excluded: rows.filter((r) => !r.account.archived && !included.includes(r)),
    archived: rows.filter((r) => r.account.archived),
  };
}

/**
 * One account: balance, this month's in and out, the latest movements. Only an account that nothing
 * uses (movements, subscriptions, goals) can be deleted; the others are archived.
 */
export function buildAccountDetail(snapshot: Snapshot, accountId: Id) {
  const account = snapshot.accounts.find((a) => a.id === accountId);
  if (!account) return null;
  const { transactions, today, meId } = snapshot;
  const movements = transactions.filter((t) => !t.deletedAt && touches(t, accountId)).sort(byNewest);
  return {
    account,
    balanceMinor: accountBalance(account, transactions, meId),
    month: accountFlows(account, transactions, meId, monthStart(today), today),
    movements: movements.slice(0, LATEST),
    movementCount: movements.length,
    canDelete:
      movements.length === 0 &&
      !snapshot.subscriptions.some((s) => !s.deletedAt && s.accountId === accountId) &&
      !snapshot.goals.some((g) => !g.deletedAt && g.accountId === accountId),
  };
}

export interface CategoryRow {
  category: Category;
  movementCount: number;
}

/** Categorie of one kind, in their order, with how many movements use each; archived ones apart. */
export function buildCategoryList(snapshot: Snapshot, kind: CategoryKind) {
  const counts = new Map<Id, number>();
  for (const tx of snapshot.transactions) {
    if (!tx.deletedAt && tx.categoryId) counts.set(tx.categoryId, (counts.get(tx.categoryId) ?? 0) + 1);
  }
  const rows = snapshot.categories
    .filter((c) => c.kind === kind)
    .sort(byOrder)
    .map((category) => ({ category, movementCount: counts.get(category.id) ?? 0 }));
  return { active: rows.filter((r) => !r.category.archived), archived: rows.filter((r) => r.category.archived) };
}

/** What still uses a category. A used category can be archived, never deleted: history keeps its name. */
export function categoryUsage(snapshot: Snapshot, categoryId: Id) {
  const movements = snapshot.transactions.filter((t) => !t.deletedAt && (t.categoryId === categoryId || t.subcategoryId === categoryId)).length;
  const budgets = snapshot.budgets.filter((b) => !b.deletedAt && b.categoryId === categoryId).length;
  const subscriptions = snapshot.subscriptions.filter((s) => !s.deletedAt && s.categoryId === categoryId).length;
  return { movements, budgets, subscriptions, canDelete: movements + budgets + subscriptions === 0 };
}

export interface PersonRow {
  person: Person;
  /** Positive: the person owes the user; negative: the user owes them. */
  balanceMinor: number;
}

/** Spese condivise: what others owe and what the user owes, people with an open balance first. */
export function buildSharedOverview(snapshot: Snapshot) {
  const balances = balancesByPerson(snapshot.transactions, snapshot.meId);
  const people = snapshot.people
    .filter((p) => !p.isMe)
    .map((person) => ({ person, balanceMinor: balances[person.id] ?? 0 }))
    .sort((a, b) => Math.abs(b.balanceMinor) - Math.abs(a.balanceMinor) || a.person.name.localeCompare(b.person.name));
  return {
    owedToMeMinor: people.reduce((sum, p) => sum + Math.max(p.balanceMinor, 0), 0),
    iOweMinor: people.reduce((sum, p) => sum + Math.max(-p.balanceMinor, 0), 0),
    people,
  };
}

/** One person: the open balance and its items, the settled history, and whether the person can be deleted. */
export function buildPersonDetail(snapshot: Snapshot, personId: Id) {
  const person = snapshot.people.find((p) => p.id === personId);
  if (!person) return null;
  const { transactions, meId } = snapshot;
  const open = openItems(transactions, meId, personId);
  const openIds = new Set(open.map((i) => i.tx.id));
  const involved = transactions.filter(
    (t) => !t.deletedAt && (t.paidByPersonId === personId || t.settlementWith === personId || t.split?.some((s) => s.personId === personId)),
  );
  return {
    person,
    balanceMinor: open.reduce((sum, i) => sum + i.amountMinor, 0),
    open,
    settled: involved.filter((t) => !openIds.has(t.id)).sort(byNewest).slice(0, HISTORY),
    canDelete: involved.length === 0,
  };
}
