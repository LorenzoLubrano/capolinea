import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useRepositories } from './provider';
import type {
  AccountDraft,
  BudgetDraft,
  CategoryDraft,
  GoalDraft,
  NewSubscription,
  NewTransaction,
  Repositories,
  SettleRecord,
  Snapshot,
  SubscriptionChanges,
  TransactionChanges,
} from './repositories';

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

export function useUpdateTransaction() {
  const repos = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: TransactionChanges }) => repos.updateTransaction(id, changes),
    onSuccess: () => client.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
}

export function useRestoreTransaction() {
  const repos = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.restoreTransaction(id),
    onSuccess: () => client.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
}

export function useAddSubscription() {
  const repos = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (draft: NewSubscription) => repos.addSubscription(draft),
    onSuccess: () => client.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
}

export function useAddPerson() {
  const repos = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => repos.addPerson(name),
    onSuccess: () => client.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
}

/** A write that refreshes the snapshot when it succeeds. */
function useSnapshotMutation<TVars, TResult>(write: (repos: Repositories, vars: TVars) => Promise<TResult>) {
  const repos = useRepositories();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => write(repos, vars),
    onSuccess: () => client.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
}

export const useUpdateSubscription = () =>
  useSnapshotMutation((r, { id, changes }: { id: string; changes: SubscriptionChanges }) => r.updateSubscription(id, changes));
export const useDeleteSubscription = () => useSnapshotMutation((r, id: string) => r.deleteSubscription(id));
export const useRestoreSubscription = () => useSnapshotMutation((r, id: string) => r.restoreSubscription(id));
export const useSaveBudget = () => useSnapshotMutation((r, draft: BudgetDraft) => r.saveBudget(draft));
export const useDeleteBudget = () => useSnapshotMutation((r, id: string) => r.deleteBudget(id));
export const useRestoreBudget = () => useSnapshotMutation((r, id: string) => r.restoreBudget(id));
export const useSaveGoal = () => useSnapshotMutation((r, draft: GoalDraft) => r.saveGoal(draft));
export const useDeleteGoal = () => useSnapshotMutation((r, id: string) => r.deleteGoal(id));
export const useRestoreGoal = () => useSnapshotMutation((r, id: string) => r.restoreGoal(id));
export const useAddContribution = () =>
  useSnapshotMutation((r, { goalId, date, amountMinor }: { goalId: string; date: string; amountMinor: number }) =>
    r.addContribution(goalId, { date, amountMinor }),
  );
export const useRemoveContribution = () =>
  useSnapshotMutation((r, { goalId, contributionId }: { goalId: string; contributionId: string }) => r.removeContribution(goalId, contributionId));
export const useSaveAccount = () => useSnapshotMutation((r, draft: AccountDraft) => r.saveAccount(draft));
export const useDeleteAccount = () => useSnapshotMutation((r, id: string) => r.deleteAccount(id));
export const useRestoreAccount = () => useSnapshotMutation((r, id: string) => r.restoreAccount(id));
export const useSaveCategory = () => useSnapshotMutation((r, draft: CategoryDraft) => r.saveCategory(draft));
export const useDeleteCategory = () => useSnapshotMutation((r, id: string) => r.deleteCategory(id));
export const useRestoreCategory = () => useSnapshotMutation((r, id: string) => r.restoreCategory(id));
export const useUpdatePerson = () => useSnapshotMutation((r, { id, name }: { id: string; name: string }) => r.updatePerson(id, name));
export const useDeletePerson = () => useSnapshotMutation((r, id: string) => r.deletePerson(id));
export const useRestorePerson = () => useSnapshotMutation((r, id: string) => r.restorePerson(id));
export const useSettleWith = () =>
  useSnapshotMutation((r, { personId, ...options }: { personId: string; date: string; accountId?: string; description?: string }) => r.settleWith(personId, options));
export const useUndoSettle = () => useSnapshotMutation((r, record: SettleRecord) => r.undoSettle(record));
export const useReplaceAll = () => useSnapshotMutation((r, data: Snapshot) => r.replaceAll(data));
