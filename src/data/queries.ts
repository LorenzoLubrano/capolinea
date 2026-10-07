import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from './provider';
import type { NewTransaction } from './repositories';

const SNAPSHOT_KEY = ['snapshot'] as const;

export function useSnapshot() {
  const repos = useRepositories();
  return useQuery({ queryKey: SNAPSHOT_KEY, queryFn: () => repos.snapshot() });
}

export function useAddTransaction() {
  const repos = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: NewTransaction) => repos.addTransaction(draft),
    onSuccess: () => client.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
}

export function useDeleteTransaction() {
  const repos = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.deleteTransaction(id),
    onSuccess: () => client.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
}
