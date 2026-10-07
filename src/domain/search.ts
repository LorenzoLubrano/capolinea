import type { Account, Category, Transaction } from './types';

export interface SearchContext {
  categories: Category[];
  accounts: Account[];
  /** Month names in the user's language, January first, so "settembre" finds September. */
  monthNames: string[];
}

/** Lower case without accents: "Caffè" and "caffe" are the same word. */
export function normalizeText(text: string): string {
  return text.toLocaleLowerCase('it-IT').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

const AMOUNT = /^(\d+)(?:[.,](\d{1,2}))?$/;

/** "29,99" or "29.99" is that exact amount; "29" is any amount from 29,00 to 29,99. */
function matchesAmount(token: string, amountMinor: number): boolean {
  const match = AMOUNT.exec(token);
  if (!match) return false;
  const units = Number(match[1]);
  if (match[2] === undefined) return Math.floor(amountMinor / 100) === units;
  return amountMinor === units * 100 + Number(match[2].padEnd(2, '0'));
}

/**
 * Instant search over merchant, description, notes, tags, category, account, month and amount.
 * Every word must match something: "amazon settembre" finds Amazon purchases in September.
 */
export function searchTransactions(transactions: Transaction[], query: string, ctx: SearchContext): Transaction[] {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return transactions;

  const categoryNames = new Map(ctx.categories.map((c) => [c.id, c]));
  const accountNames = new Map(ctx.accounts.map((a) => [a.id, a.name]));
  const categoryText = (id?: string) => {
    const category = id ? categoryNames.get(id) : undefined;
    const parent = category?.parentId ? categoryNames.get(category.parentId) : undefined;
    return [category?.name, parent?.name];
  };

  return transactions.filter((tx) => {
    const haystack = normalizeText(
      [
        tx.merchant,
        tx.description,
        tx.notes,
        ...tx.tags,
        ...categoryText(tx.categoryId),
        ...categoryText(tx.subcategoryId),
        accountNames.get(tx.accountId),
        tx.toAccountId ? accountNames.get(tx.toAccountId) : undefined,
        ctx.monthNames[Number(tx.date.slice(5, 7)) - 1],
      ]
        .filter(Boolean)
        .join(' '),
    );
    return tokens.every((token) => haystack.includes(token) || matchesAmount(token, tx.amountMinor));
  });
}
