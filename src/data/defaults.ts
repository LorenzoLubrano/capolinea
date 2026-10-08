import type { Account, Category, Id, LocalDate, Person } from '@/domain/types';

import type { Snapshot } from './repositories';

/**
 * What a new or wiped app starts from: the default categories and the user; `CASH` is the account
 * the onboarding creates when the first account is skipped.
 * Product data, not example data: phase 2 seeds the database with the same records.
 */

const STAMP = '2026-08-01T08:00:00Z';
const meta = { createdAt: STAMP, updatedAt: STAMP };

const category = (id: Id, name: string, icon: string, color: string, sortOrder: number, kind: Category['kind'] = 'expense'): Category => ({
  id, ...meta, name, kind, icon, color, isDefault: true, archived: false, sortOrder,
});

/** Colours are line keys resolved by the theme, never hex values. */
export const DEFAULT_CATEGORIES: Category[] = [
  category('cat-groceries', 'Spesa alimentare', 'ShoppingCart', 'green', 0),
  category('cat-restaurants', 'Ristoranti', 'ForkKnife', 'yellow', 1),
  category('cat-transport', 'Trasporti', 'Train', 'sky', 2),
  category('cat-shopping', 'Shopping', 'ShoppingBag', 'magenta', 3),
  category('cat-home', 'Casa', 'House', 'blue', 4),
  category('cat-bills', 'Bollette', 'Lightning', 'orange', 5),
  category('cat-subscriptions', 'Abbonamenti', 'ArrowsClockwise', 'lilac', 6),
  category('cat-health', 'Salute', 'Heartbeat', 'teal', 7),
  category('cat-leisure', 'Svago', 'FilmSlate', 'indigo', 8),
  category('cat-travel', 'Viaggi', 'AirplaneTilt', 'olive', 9),
  category('cat-education', 'Istruzione', 'GraduationCap', 'brown', 10),
  category('cat-tech', 'Tecnologia', 'Laptop', 'slate', 11),
  category('cat-care', 'Cura personale', 'Sparkle', 'pink', 12),
  category('cat-gifts', 'Regali', 'Gift', 'plum', 13),
  category('cat-other', 'Altro', 'DotsThree', 'grey', 14),
  category('cat-salary', 'Stipendio', 'Briefcase', 'grey', 20, 'income'),
  category('cat-refund-income', 'Rimborsi', 'ArrowCounterClockwise', 'grey', 21, 'income'),
  category('cat-scholarship', 'Borsa di studio', 'GraduationCap', 'grey', 22, 'income'),
  category('cat-received', 'Soldi ricevuti', 'HandCoins', 'grey', 23, 'income'),
  category('cat-other-income', 'Altre entrate', 'DotsThree', 'grey', 24, 'income'),
];

export const ME: Person = { id: 'person-me', ...meta, name: 'Lorenzo', isMe: true };

export const CASH: Account = {
  id: 'acc-cash', ...meta, name: 'Contanti', type: 'cash', currency: 'EUR', openingBalanceMinor: 0, color: 'green', includeInTotal: true, archived: false, sortOrder: 0,
};

/** A fresh start: default categories and the user. The onboarding adds the first account. */
export function createEmptyDataset(today: LocalDate, currency = 'EUR'): Snapshot {
  return {
    today,
    currency,
    meId: ME.id,
    people: [ME],
    accounts: [],
    categories: DEFAULT_CATEGORIES,
    subscriptions: [],
    budgets: [],
    goals: [],
    transactions: [],
  };
}
