import type { Id, LocalDate, SplitShare, Transaction } from './types';

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

export type SplitMode = 'equal' | 'amounts' | 'percent';

/** How the user wants to split: who, how, and who paid. `values` holds cents or percentages by person. */
export interface SplitDraft {
  personIds: Id[];
  mode: SplitMode;
  values: Record<Id, number>;
  paidBy: Id;
}

export type SplitResult =
  | { ok: true; shares: SplitShare[] }
  | { ok: false; reason: 'people' }
  | { ok: false; reason: 'sum'; differenceMinor: number }
  | { ok: false; reason: 'percent'; differencePercent: number };

/** Shares from a split draft, exact to the cent. The payer's own share is settled by definition. */
export function computeShares(totalMinor: number, draft: SplitDraft): SplitResult {
  const { personIds, mode, values, paidBy } = draft;
  if (personIds.length < 2) return { ok: false, reason: 'people' };

  let amounts: number[];
  if (mode === 'equal') {
    amounts = splitEvenly(totalMinor, personIds).map((s) => s.amountMinor);
  } else if (mode === 'amounts') {
    amounts = personIds.map((id) => values[id] ?? 0);
    const differenceMinor = totalMinor - amounts.reduce((sum, a) => sum + a, 0);
    if (differenceMinor !== 0) return { ok: false, reason: 'sum', differenceMinor };
  } else {
    const percents = personIds.map((id) => values[id] ?? 0);
    const differencePercent = Math.round((100 - percents.reduce((sum, p) => sum + p, 0)) * 100) / 100;
    if (differencePercent !== 0) return { ok: false, reason: 'percent', differencePercent };
    const floors = percents.map((p) => Math.floor((totalMinor * p) / 100));
    const leftover = totalMinor - floors.reduce((sum, a) => sum + a, 0);
    amounts = floors.map((a, i) => a + (i < leftover ? 1 : 0));
  }

  return {
    ok: true,
    shares: personIds.map((personId, i) => ({ personId, amountMinor: amounts[i], settled: personId === paidBy })),
  };
}

/** What can still be refunded of an expense: its amount minus the refunds already recorded. */
export function refundableMinor(expense: Transaction, transactions: Transaction[]): number {
  const refunded = transactions
    .filter((t) => t.refundOfId === expense.id && !t.deletedAt)
    .reduce((sum, t) => sum + t.amountMinor, 0);
  return Math.max(expense.amountMinor - refunded, 0);
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

/** Which share of a split is open between the user and one person, and its sign for the user. */
function openShare(tx: Transaction, meId: Id, personId: Id): { share: SplitShare; amountMinor: number } | null {
  if (tx.deletedAt || !tx.split) return null;
  const payer = tx.paidByPersonId ?? meId;
  const debtor = payer === meId ? personId : payer === personId ? meId : null;
  const share = debtor ? tx.split.find((s) => s.personId === debtor && !s.settled) : undefined;
  if (!share) return null;
  return { share, amountMinor: payer === meId ? share.amountMinor : -share.amountMinor };
}

/** Split expenses still open with one person, newest first. Positive: they owe the user; negative: the user owes them. */
export function openItems(txs: Transaction[], meId: Id, personId: Id): { tx: Transaction; amountMinor: number }[] {
  return txs
    .map((tx) => ({ tx, open: openShare(tx, meId, personId) }))
    .filter((entry) => entry.open !== null)
    .sort((a, b) => b.tx.date.localeCompare(a.tx.date) || b.tx.createdAt.localeCompare(a.tx.createdAt))
    .map(({ tx, open }) => ({ tx, amountMinor: open!.amountMinor }));
}

/**
 * Evening out with one person: every open share between the two is marked settled on `date`.
 * `amountMinor` is who pays whom: positive, the person pays the user.
 */
export function settlementPlan(
  txs: Transaction[],
  meId: Id,
  personId: Id,
  date: LocalDate,
): { changes: { id: Id; split: SplitShare[] }[]; amountMinor: number } {
  const items = openItems(txs, meId, personId);
  return {
    amountMinor: items.reduce((sum, item) => sum + item.amountMinor, 0),
    changes: items.map(({ tx }) => {
      const { share } = openShare(tx, meId, personId)!;
      return { id: tx.id, split: tx.split!.map((s) => (s === share ? { ...s, settled: true, settledAt: date } : s)) };
    }),
  };
}
