import { isWithin } from './dates';
import type { Account, CurrencyCode, Id, LocalDate, Transaction } from './types';

/**
 * How a movement changes an account: positive in, negative out, 0 when it does not touch it.
 * A split expense counts in full when the user paid (the account paid all of it) and not at all when
 * someone else paid.
 */
function effect(account: Account, tx: Transaction, meId: Id): number {
  if (tx.deletedAt) return 0;
  if (tx.accountId === account.id) {
    if (tx.type === 'income' || tx.type === 'refund') return tx.amountMinor;
    if (tx.type === 'expense' && tx.paidByPersonId && tx.paidByPersonId !== meId) return 0;
    return -tx.amountMinor;
  }
  if (tx.type === 'transfer' && tx.toAccountId === account.id) return tx.amountMinor;
  return 0;
}

/** Opening balance plus every live movement touching the account. */
export function accountBalance(account: Account, txs: Transaction[], meId: Id): number {
  return txs.reduce((balance, tx) => balance + effect(account, tx, meId), account.openingBalanceMinor);
}

/** The opening balance that makes the account show `targetMinor` today: correcting a balance keeps every movement. */
export function openingForBalance(account: Account, txs: Transaction[], meId: Id, targetMinor: number): number {
  return account.openingBalanceMinor + targetMinor - accountBalance(account, txs, meId);
}

/** What came into and went out of the account in the range. */
export function accountFlows(account: Account, txs: Transaction[], meId: Id, from: LocalDate, to: LocalDate): { inMinor: number; outMinor: number } {
  let inMinor = 0;
  let outMinor = 0;
  for (const tx of txs) {
    if (!isWithin(tx.date, from, to)) continue;
    const change = effect(account, tx, meId);
    if (change > 0) inMinor += change;
    else outMinor -= change;
  }
  return { inMinor, outMinor };
}

/** Sum of active accounts flagged "include in total", in the main currency only. */
export function totalBalance(
  accounts: Account[],
  txs: Transaction[],
  currency: CurrencyCode,
  meId: Id,
): { totalMinor: number; accountCount: number } {
  const counted = accounts.filter(
    (account) => account.includeInTotal && !account.archived && !account.deletedAt && account.currency === currency,
  );
  return {
    totalMinor: counted.reduce((sum, account) => sum + accountBalance(account, txs, meId), 0),
    accountCount: counted.length,
  };
}
