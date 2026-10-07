import { useMemo } from 'react';

import { useSnapshot } from '@/data/queries';
import { searchTransactions } from '@/domain/search';
import { monthNames } from '@/services/format/dates';
import { useTransactionFilters } from '@/state/transaction-filters';

import { applyFilters, sortTransactions } from './list';

const MONTHS = monthNames();

/** The snapshot plus what the Movimenti list shows right now: search, filters and order applied. */
export function useVisibleTransactions() {
  const snapshot = useSnapshot();
  const filters = useTransactionFilters();
  const { data } = snapshot;

  const results = useMemo(() => {
    if (!data) return [];
    const found = searchTransactions(data.transactions, filters.query, {
      categories: data.categories,
      accounts: data.accounts,
      monthNames: MONTHS,
    });
    return sortTransactions(applyFilters(found, filters, data.today), filters.sort);
  }, [data, filters]);

  return { ...snapshot, filters, results };
}
