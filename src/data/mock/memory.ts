import { generateDueCharges } from '@/domain/subscriptions';
import type { Person, Subscription, Transaction } from '@/domain/types';

import type { NewSubscription, NewTransaction, Repositories, Snapshot, TransactionChanges } from '../repositories';
import { createDataset, type Dataset } from './seed';

/** In-memory repositories over the example dataset. A short delay keeps loading states honest. */
export function createMemoryRepositories(dataset: Dataset = createDataset(), latencyMs = 120): Repositories {
  const state: Dataset = {
    ...dataset,
    transactions: [...dataset.transactions],
    subscriptions: [...dataset.subscriptions],
    people: [...dataset.people],
  };
  let counter = 0;
  const newId = (kind: string) => `local-${kind}-${Date.now()}-${++counter}`;
  const wait = () => new Promise((resolve) => setTimeout(resolve, latencyMs));
  const now = () => new Date().toISOString();

  const update = (id: string, change: (tx: Transaction) => Transaction) => {
    state.transactions = state.transactions.map((tx) => (tx.id === id ? change(tx) : tx));
  };

  return {
    async snapshot(): Promise<Snapshot> {
      await wait();
      return { ...state, transactions: state.transactions.filter((tx) => !tx.deletedAt) };
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

    async addPerson(name: string) {
      await wait();
      const stamp = now();
      const person: Person = { id: newId('person'), createdAt: stamp, updatedAt: stamp, name, isMe: false };
      state.people = [...state.people, person];
      return person;
    },
  };
}
