import type { Transaction } from '@/domain/types';
import { it } from '@/i18n/it';

/** The secondary line of a movement: category, account and what kind of movement it is. */
export function describeTransaction(
  tx: Transaction,
  names: { categoryName?: string; accountName?: string; toAccountName?: string },
): string {
  if (tx.type === 'transfer') return it.transactions.transfer(names.accountName ?? '', names.toAccountName ?? '');
  return [
    names.categoryName,
    names.accountName,
    tx.subscriptionId ? it.transactions.subscription : undefined,
    tx.split ? it.transactions.split : undefined,
    tx.settlementWith ? it.transactions.settlement : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}
