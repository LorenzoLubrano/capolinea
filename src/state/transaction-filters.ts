import { create } from 'zustand';

import type { Id } from '@/domain/types';
import { DEFAULT_FILTERS, type Filters, type KindFilter, type PeriodFilter, type SortOrder } from '@/features/transactions/list';

interface TransactionFiltersState extends Filters {
  /** Search text, kept here so the filter sheet can count the same results as the list. */
  query: string;
  setQuery: (query: string) => void;
  setKind: (kind: KindFilter) => void;
  setPeriod: (period: PeriodFilter) => void;
  setSort: (sort: SortOrder) => void;
  toggleCategory: (id: Id) => void;
  toggleAccount: (id: Id) => void;
  /** The filter sheet's "Azzera": sort, period, categories, accounts. */
  resetSheet: () => void;
  /** Everything, search included. */
  resetAll: () => void;
}

const toggle = (list: Id[], id: Id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

/** What the Movimenti list shows. Lives for the session, like the scroll position. */
export const useTransactionFilters = create<TransactionFiltersState>((set) => ({
  ...DEFAULT_FILTERS,
  query: '',
  setQuery: (query) => set({ query }),
  setKind: (kind) => set({ kind }),
  setPeriod: (period) => set({ period }),
  setSort: (sort) => set({ sort }),
  toggleCategory: (id) => set((state) => ({ categoryIds: toggle(state.categoryIds, id) })),
  toggleAccount: (id) => set((state) => ({ accountIds: toggle(state.accountIds, id) })),
  resetSheet: () =>
    set({ sort: DEFAULT_FILTERS.sort, period: DEFAULT_FILTERS.period, categoryIds: [], accountIds: [] }),
  resetAll: () => set({ ...DEFAULT_FILTERS, query: '' }),
}));
