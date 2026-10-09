import type { Snapshot } from '@/data/repositories';
import { isWithin } from '@/domain/dates';
import type { LocalDate, Transaction } from '@/domain/types';
import { it } from '@/i18n/it';
import { csvAmount, csvCell, csvLine } from '@/services/format/csv';

export const BACKUP_FORMAT = 'app-spese-backup';
export const BACKUP_VERSION = 1;

/** From the account's point of view: money out is negative. Transfers move money between the user's own accounts. */
function signedAmount(tx: Transaction): number {
  return tx.type === 'expense' ? -tx.amountMinor : tx.amountMinor;
}

/**
 * Movements as CSV for Excel or Numbers in Italian: semicolons, decimal comma, oldest first.
 * Text cells are escaped against formulas. The byte order mark is added when the file is written.
 */
export function buildTransactionsCsv(snapshot: Snapshot, range: { from?: LocalDate; to?: LocalDate }): string {
  const accounts = new Map(snapshot.accounts.map((a) => [a.id, a.name]));
  const categories = new Map(snapshot.categories.map((c) => [c.id, c.name]));
  const people = new Map(snapshot.people.map((p) => [p.id, p.name]));
  const rows = snapshot.transactions
    .filter((t) => !t.deletedAt && isWithin(t.date, range.from ?? '0000-01-01', range.to ?? '9999-12-31'))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .map((t) => {
      const myShare = t.split?.find((s) => s.personId === snapshot.meId)?.amountMinor;
      const paidBy = t.paidByPersonId && t.paidByPersonId !== snapshot.meId ? people.get(t.paidByPersonId) : undefined;
      return csvLine([
        t.date,
        csvCell(t.settlementWith ? it.detail.settlementType : it.detail.types[t.type]),
        csvAmount(signedAmount(t)),
        csvCell(t.currency),
        csvCell(accounts.get(t.accountId) ?? ''),
        csvCell(t.toAccountId ? (accounts.get(t.toAccountId) ?? '') : ''),
        csvCell(t.categoryId ? (categories.get(t.categoryId) ?? '') : ''),
        csvCell(t.merchant ?? ''),
        csvCell(t.description ?? ''),
        csvCell(t.notes ?? ''),
        csvCell(t.tags.join(', ')),
        myShare !== undefined ? csvAmount(myShare) : '',
        csvCell(paidBy ?? ''),
      ]);
    });
  return [csvLine(it.exportData.csvHeaders.map(csvCell)), ...rows].join('\r\n');
}

/** Everything needed to rebuild the data on another phone, as readable JSON. */
export function buildBackup(snapshot: Snapshot, exportedAt: string): string {
  const { currency, meId, people, accounts, categories, subscriptions, budgets, goals, transactions } = snapshot;
  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt,
      data: { currency, meId, people, accounts, categories, subscriptions, budgets, goals, transactions },
    },
    null,
    2,
  );
}

export function exportFileName(kind: 'csv' | 'backup', date: LocalDate): string {
  return kind === 'csv' ? `capolinea-movimenti-${date}.csv` : `capolinea-backup-${date}.json`;
}
