import type { Account, CurrencyCode, Transaction } from './types';

/** Opening balance plus every live movement touching the account. Split expenses count in full: the account paid all of it. */
export function accountBalance(account: Account, txs: Transaction[]): number {
  let balance = account.openingBalanceMinor;
  for (const tx of txs) {
    if (tx.deletedAt) continue;
    if (tx.accountId === account.id) {
      if (tx.type === 'income' || tx.type === 'refund') balance += tx.amountMinor;
      else balance -= tx.amountMinor;
    } else if (tx.type === 'transfer' && tx.toAccountId === account.id) {
      balance += tx.amountMinor;
    }
  }
  return balance;
}

/** Sum of active accounts flagged "include in total", in the main currency only. */
export function totalBalance(
  accounts: Account[],
  txs: Transaction[],
  currency: CurrencyCode,
): { totalMinor: number; accountCount: number } {
  const counted = accounts.filter(
    (account) => account.includeInTotal && !account.archived && !account.deletedAt && account.currency === currency,
  );
  return {
    totalMinor: counted.reduce((sum, account) => sum + accountBalance(account, txs), 0),
    accountCount: counted.length,
  };
}
