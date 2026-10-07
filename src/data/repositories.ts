import type { Account, Budget, Category, Goal, Id, LocalDate, Person, Subscription, Transaction } from '@/domain/types';

/**
 * Data access contract. Every method is async, like the SQLite implementation of phase 2.
 * UI code depends on these interfaces only, never on an implementation.
 */

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>;

/** A new subscription: its first billing date is `anchorDate`; the rest is computed. */
export type NewSubscription = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'nextBillingDate' | 'startDate'>;

/** Fields to change; a field set to `undefined` is removed. */
export type TransactionChanges = Partial<NewTransaction>;

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
  addPerson(name: string): Promise<Person>;
}
