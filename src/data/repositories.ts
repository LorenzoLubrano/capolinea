import type { Account, Budget, Category, Goal, GoalContribution, Id, LocalDate, Person, Subscription, Transaction } from '@/domain/types';

/**
 * Data access contract. Every method is async, like the SQLite implementation of phase 2.
 * UI code depends on these interfaces only, never on an implementation.
 */

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

/** A new subscription: its first billing date is `anchorDate`; the rest is computed. */
export type NewSubscription = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'nextBillingDate' | 'startDate'>;

/** Fields to change; a field set to `undefined` is removed. */
export type TransactionChanges = Partial<NewTransaction>;

/** Changing `anchorDate` moves the next charge there. */
export type SubscriptionChanges = Partial<NewSubscription>;

/** A budget to create (no `id`) or to update. */
export type BudgetDraft = Omit<Budget, 'id' | 'createdAt' | 'updatedAt'> & { id?: Id };

/** A goal to create (no `id`) or to update; contributions are recorded separately. */
export type GoalDraft = Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'contributions'> & { id?: Id };

export interface Snapshot {
  today: LocalDate;
  currency: string;
  meId: Id;
  people: Person[];
  accounts: Account[];
  categories: Category[];
  subscriptions: Subscription[];
  budgets: Budget[];
  goals: Goal[];
  transactions: Transaction[];
}

export interface Repositories {
  /** Everything the screens read, in one consistent snapshot. Small data: fine for the prototype. */
  snapshot(): Promise<Snapshot>;
  addTransaction(draft: NewTransaction): Promise<Transaction>;
  /** Editing a subscription charge marks it, so the generator never overwrites it. */
  updateTransaction(id: Id, changes: TransactionChanges): Promise<Transaction>;
  /** Soft delete, so undo and future sync both work. */
  deleteTransaction(id: Id): Promise<void>;
  restoreTransaction(id: Id): Promise<void>;
  /** Also creates the charges already due, so a subscription started months ago shows its history. */
  addSubscription(draft: NewSubscription): Promise<{ subscription: Subscription; generated: number }>;
  /** Runs the charge generator again, so a next charge moved into the past is recorded. */
  updateSubscription(id: Id, changes: SubscriptionChanges): Promise<{ subscription: Subscription; generated: number }>;
  /** The charges already recorded stay: they are history. */
  deleteSubscription(id: Id): Promise<void>;
  restoreSubscription(id: Id): Promise<void>;
  addPerson(name: string): Promise<Person>;
  saveBudget(draft: BudgetDraft): Promise<Budget>;
  deleteBudget(id: Id): Promise<void>;
  restoreBudget(id: Id): Promise<void>;
  saveGoal(draft: GoalDraft): Promise<Goal>;
  deleteGoal(id: Id): Promise<void>;
  restoreGoal(id: Id): Promise<void>;
  addContribution(goalId: Id, contribution: Omit<GoalContribution, 'id'>): Promise<Goal>;
  removeContribution(goalId: Id, contributionId: Id): Promise<Goal>;
}
