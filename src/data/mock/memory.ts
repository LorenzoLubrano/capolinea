import type { Transaction } from '@/domain/types';

import type { NewTransaction, Repositories, Snapshot } from '../repositories';
import { createDataset, type Dataset } from './seed';

/** In-memory repositories over the example dataset. A short delay keeps loading states honest. */
export function createMemoryRepositories(dataset: Dataset = createDataset(), latencyMs = 120): Repositories {
  const state: Dataset = { ...dataset, transactions: [...dataset.transactions] };
  let counter = 0;
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
      const tx: Transaction = { ...draft, id: `local-${Date.now()}-${++counter}`, createdAt: stamp, updatedAt: stamp };
      state.transactions = [...state.transactions, tx];
      return tx;
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
  };
}
