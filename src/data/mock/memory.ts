import { addDays } from '@/domain/dates';
import { generateDueCharges, occurrenceAfter } from '@/domain/subscriptions';
import type { Budget, Goal, Person, RecordMeta, Subscription, Transaction } from '@/domain/types';

import type {
  BudgetDraft,
  GoalDraft,
  NewSubscription,
  NewTransaction,
  Repositories,
  Snapshot,
  SubscriptionChanges,
  TransactionChanges,
} from '../repositories';
import { createDataset, type Dataset } from './seed';

/** In-memory repositories over the example dataset. A short delay keeps loading states honest. */
export function createMemoryRepositories(dataset: Dataset = createDataset(), latencyMs = 120): Repositories {
  const state: Dataset = {
    ...dataset,
    transactions: [...dataset.transactions],
    subscriptions: [...dataset.subscriptions],
    people: [...dataset.people],
    budgets: [...dataset.budgets],
    goals: [...dataset.goals],
  };
  let counter = 0;
  const newId = (kind: string) => `local-${kind}-${Date.now()}-${++counter}`;
  const wait = () => new Promise((resolve) => setTimeout(resolve, latencyMs));
  const now = () => new Date().toISOString();

  const update = (id: string, change: (tx: Transaction) => Transaction) => {
    state.transactions = state.transactions.map((tx) => (tx.id === id ? change(tx) : tx));
  };
  const live = <T extends RecordMeta>(list: T[]) => list.filter((item) => !item.deletedAt);
  /** Soft delete or restore in any collection, so undo and future sync both work. */
  const setDeleted = <T extends RecordMeta>(list: T[], id: string, deleted: boolean): T[] =>
    list.map((item) => {
      if (item.id !== id) return item;
      const { deletedAt: _old, ...rest } = item;
      return (deleted ? { ...rest, deletedAt: now(), updatedAt: now() } : { ...rest, updatedAt: now() }) as T;
    });
  const findGoal = (id: string) => {
    const goal = state.goals.find((g) => g.id === id);
    if (!goal) throw new Error('Goal not found: ' + id);
    return goal;
  };
  const replaceGoal = (goal: Goal) => {
    state.goals = state.goals.map((g) => (g.id === goal.id ? goal : g));
    return goal;
  };

  return {
    async snapshot(): Promise<Snapshot> {
      await wait();
      return {
        ...state,
        transactions: live(state.transactions),
        subscriptions: live(state.subscriptions),
        budgets: live(state.budgets),
        goals: live(state.goals),
      };
    },

    async addTransaction(draft: NewTransaction) {
      await wait();
      const stamp = now();
      const tx: Transaction = { ...draft, id: newId('tx'), createdAt: stamp, updatedAt: stamp };
      state.transactions = [...state.transactions, tx];
      return tx;
    },

    async updateTransaction(id: string, changes: TransactionChanges) {
      await wait();
      const current = state.transactions.find((tx) => tx.id === id);
      if (!current) throw new Error(`Transaction ${id} not found`);
      const next: Record<string, unknown> = { ...current, ...changes, updatedAt: now() };
      for (const [key, value] of Object.entries(changes)) if (value === undefined) delete next[key];
      if (current.subscriptionId) next.editedAfterGeneration = true;
      const updated = next as unknown as Transaction;
      update(id, () => updated);
      return updated;
    },

    async deleteTransaction(id) {
      await wait();
      const stamp = now();
      update(id, (tx) => ({ ...tx, deletedAt: stamp, updatedAt: stamp }));
    },

    async restoreTransaction(id) {
      await wait();
      update(id, ({ deletedAt: _deleted, ...tx }) => ({ ...tx, updatedAt: now() }));
    },

    async addSubscription(draft: NewSubscription) {
      await wait();
      const stamp = now();
      const created: Subscription = {
        ...draft,
        id: newId('sub'),
        createdAt: stamp,
        updatedAt: stamp,
        startDate: draft.anchorDate,
        nextBillingDate: draft.anchorDate,
      };
      const { charges, subscriptions } = generateDueCharges([created], state.transactions, state.today, {
        makeId: () => newId('tx'),
        now: stamp,
      });
      const [subscription] = subscriptions;
      state.subscriptions = [...state.subscriptions, subscription];
      state.transactions = [...state.transactions, ...charges];
      return { subscription, generated: charges.length };
    },

    async updateSubscription(id: string, changes: SubscriptionChanges) {
      await wait();
      const current = state.subscriptions.find((s) => s.id === id);
      if (!current) throw new Error('Subscription not found: ' + id);
      const stamp = now();
      // Resuming skips the paused period: the next charge is the first billing date from today.
      const resumed = changes.active === true && !current.active;
      const edited: Subscription = {
        ...current,
        ...changes,
        ...(changes.anchorDate ? { nextBillingDate: changes.anchorDate } : {}),
        updatedAt: stamp,
      };
      if (resumed && !changes.anchorDate && edited.nextBillingDate < state.today) {
        edited.nextBillingDate = occurrenceAfter(edited.anchorDate, edited.frequency, addDays(state.today, -1));
      }
      const { charges, subscriptions } = generateDueCharges([edited], state.transactions, state.today, {
        makeId: () => newId('tx'),
        now: stamp,
      });
      const [subscription] = subscriptions;
      state.subscriptions = state.subscriptions.map((s) => (s.id === id ? subscription : s));
      state.transactions = [...state.transactions, ...charges];
      return { subscription, generated: charges.length };
    },

    async deleteSubscription(id) {
      await wait();
      state.subscriptions = setDeleted(state.subscriptions, id, true);
    },

    async restoreSubscription(id) {
      await wait();
      state.subscriptions = setDeleted(state.subscriptions, id, false);
    },

    async saveBudget(draft: BudgetDraft) {
      await wait();
      const stamp = now();
      const existing = draft.id ? state.budgets.find((b) => b.id === draft.id) : undefined;
      const budget: Budget = existing
        ? { ...existing, ...draft, id: existing.id, updatedAt: stamp }
        : { ...draft, id: newId('budget'), createdAt: stamp, updatedAt: stamp };
      state.budgets = existing ? state.budgets.map((b) => (b.id === budget.id ? budget : b)) : [...state.budgets, budget];
      return budget;
    },

    async deleteBudget(id) {
      await wait();
      state.budgets = setDeleted(state.budgets, id, true);
    },

    async restoreBudget(id) {
      await wait();
      state.budgets = setDeleted(state.budgets, id, false);
    },

    async saveGoal(draft: GoalDraft) {
      await wait();
      const stamp = now();
      const { id, ...fields } = draft;
      if (id) return replaceGoal({ ...findGoal(id), ...fields, updatedAt: stamp });
      const goal: Goal = { ...fields, id: newId('goal'), createdAt: stamp, updatedAt: stamp, contributions: [] };
      state.goals = [...state.goals, goal];
      return goal;
    },

    async deleteGoal(id) {
      await wait();
      state.goals = setDeleted(state.goals, id, true);
    },

    async restoreGoal(id) {
      await wait();
      state.goals = setDeleted(state.goals, id, false);
    },

    async addContribution(goalId, contribution) {
      await wait();
      const goal = findGoal(goalId);
      const contributions = [...goal.contributions, { ...contribution, id: newId('contribution') }];
      return replaceGoal({ ...goal, contributions, updatedAt: now() });
    },

    async removeContribution(goalId, contributionId) {
      await wait();
      const goal = findGoal(goalId);
      return replaceGoal({ ...goal, contributions: goal.contributions.filter((c) => c.id !== contributionId), updatedAt: now() });
    },

    async addPerson(name: string) {
      await wait();
      const stamp = now();
      const person: Person = { id: newId('person'), createdAt: stamp, updatedAt: stamp, name, isMe: false };
      state.people = [...state.people, person];
      return person;
    },
  };
}
