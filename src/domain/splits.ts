import type { Id, SplitShare, Transaction } from './types';

/** Equal shares that always add up to the total: leftover cents go to the first people. */
export function splitEvenly(totalMinor: number, personIds: Id[]): SplitShare[] {
  const base = Math.floor(totalMinor / personIds.length);
  const leftover = totalMinor - base * personIds.length;
  return personIds.map((personId, index) => ({
    personId,
    amountMinor: base + (index < leftover ? 1 : 0),
    settled: false,
  }));
}

/**
 * Net open balance per person, unsettled shares only.
 * Positive: the person owes the user. Negative: the user owes the person.
 */
export function balancesByPerson(txs: Transaction[], meId: Id): Record<Id, number> {
  const balances: Record<Id, number> = {};
  const add = (personId: Id, amount: number) => {
    balances[personId] = (balances[personId] ?? 0) + amount;
  };

  for (const tx of txs) {
    if (tx.deletedAt || !tx.split) continue;
    const payer = tx.paidByPersonId ?? meId;
    for (const share of tx.split) {
      if (share.settled || share.personId === payer) continue;
      if (payer === meId) add(share.personId, share.amountMinor);
      else if (share.personId === meId) add(payer, -share.amountMinor);
    }
  }
  return balances;
}
