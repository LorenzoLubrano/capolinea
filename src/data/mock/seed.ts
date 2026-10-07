import { addDays, dayOfMonth } from '@/domain/dates';
import { splitEvenly } from '@/domain/splits';
import { generateDueCharges } from '@/domain/subscriptions';
import type {
  Account,
  Budget,
  Category,
  Goal,
  Id,
  LocalDate,
  Person,
  Subscription,
  Transaction,
} from '@/domain/types';

/**
 * Deterministic example data for the prototype: August to the pinned "today".
 * Every amount is synthetic and is presented in the app as example data.
 */

export interface Dataset {
  today: LocalDate;
  currency: string;
  meId: Id;
  people: Person[];
  accounts: Account[];
  categories: Category[];
  subscriptions: Subscription[];
  budgets: Budget[];
  goals: Goal[];
  transactions: Transaction[];
}

export const PINNED_TODAY: LocalDate = '2026-10-24';
const START: LocalDate = '2026-08-01';
const STAMP = '2026-08-01T08:00:00Z';
const meta = { createdAt: STAMP, updatedAt: STAMP };

/** mulberry32: small seeded PRNG so the example data never changes between launches. */
function prng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PEOPLE: Person[] = [
  { id: 'person-me', ...meta, name: 'Lorenzo', isMe: true },
  { id: 'person-mario', ...meta, name: 'Mario', isMe: false },
  { id: 'person-giulia', ...meta, name: 'Giulia', isMe: false },
];

export const ACCOUNTS: Account[] = [
  { id: 'acc-bank', ...meta, name: 'Conto corrente', type: 'bank', currency: 'EUR', openingBalanceMinor: 240000, color: 'blue', includeInTotal: true, archived: false, sortOrder: 0 },
  { id: 'acc-revolut', ...meta, name: 'Revolut', type: 'ewallet', currency: 'EUR', openingBalanceMinor: 60000, color: 'sky', includeInTotal: true, archived: false, sortOrder: 1 },
  { id: 'acc-paypal', ...meta, name: 'PayPal', type: 'ewallet', currency: 'EUR', openingBalanceMinor: 8000, color: 'indigo', includeInTotal: true, archived: false, sortOrder: 2 },
  { id: 'acc-cash', ...meta, name: 'Contanti', type: 'cash', currency: 'EUR', openingBalanceMinor: 12000, color: 'green', includeInTotal: true, archived: false, sortOrder: 3 },
  { id: 'acc-card', ...meta, name: 'Carta di credito', type: 'credit_card', currency: 'EUR', openingBalanceMinor: 0, color: 'slate', includeInTotal: true, archived: false, sortOrder: 4 },
  { id: 'acc-savings', ...meta, name: 'Conto deposito', type: 'savings', currency: 'EUR', openingBalanceMinor: 500000, color: 'olive', includeInTotal: false, archived: false, sortOrder: 5 },
];

const category = (id: Id, name: string, icon: string, color: string, sortOrder: number, kind: Category['kind'] = 'expense'): Category => ({
  id, ...meta, name, kind, icon, color, isDefault: true, archived: false, sortOrder,
});

/** Colours are line keys resolved by the theme, never hex values. */
export const CATEGORIES: Category[] = [
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

const sub = (
  id: Id, name: string, amountMinor: number, anchorDate: LocalDate, categoryId: Id, accountId: Id,
  frequency: Subscription['frequency'] = { unit: 'month', interval: 1 },
): Subscription => ({
  id, ...meta, name, amountMinor, currency: 'EUR', frequency, anchorDate, nextBillingDate: anchorDate,
  startDate: anchorDate, categoryId, accountId, active: true,
});

export const SUBSCRIPTIONS: Subscription[] = [
  sub('sub-netflix', 'Netflix', 1399, '2025-03-05', 'cat-subscriptions', 'acc-revolut'),
  sub('sub-icloud', 'iCloud+', 299, '2025-06-15', 'cat-subscriptions', 'acc-revolut'),
  sub('sub-spotify', 'Spotify', 1099, '2024-11-23', 'cat-subscriptions', 'acc-revolut'),
  sub('sub-gym', 'Palestra', 3990, '2026-01-28', 'cat-health', 'acc-bank'),
  sub('sub-phone', 'Telefono', 999, '2025-09-30', 'cat-bills', 'acc-bank'),
  sub('sub-prime', 'Amazon Prime', 4990, '2026-03-10', 'cat-subscriptions', 'acc-paypal', { unit: 'year', interval: 1 }),
  sub('sub-insurance', 'Assicurazione auto', 45600, '2026-06-18', 'cat-transport', 'acc-bank', { unit: 'year', interval: 1 }),
];

export const BUDGETS: Budget[] = [
  { id: 'budget-global', ...meta, scope: 'global', amountMinor: 160000, currency: 'EUR', fromMonth: '2026-08' },
  { id: 'budget-groceries', ...meta, scope: 'category', categoryId: 'cat-groceries', amountMinor: 35000, currency: 'EUR', fromMonth: '2026-08' },
  { id: 'budget-restaurants', ...meta, scope: 'category', categoryId: 'cat-restaurants', amountMinor: 15000, currency: 'EUR', fromMonth: '2026-08' },
  { id: 'budget-transport', ...meta, scope: 'category', categoryId: 'cat-transport', amountMinor: 12000, currency: 'EUR', fromMonth: '2026-08' },
  { id: 'budget-shopping', ...meta, scope: 'category', categoryId: 'cat-shopping', amountMinor: 15000, currency: 'EUR', fromMonth: '2026-08' },
  { id: 'budget-leisure', ...meta, scope: 'category', categoryId: 'cat-leisure', amountMinor: 8000, currency: 'EUR', fromMonth: '2026-08' },
];

export const GOALS: Goal[] = [
  { id: 'goal-macbook', ...meta, name: 'MacBook', icon: 'Laptop', color: 'slate', targetMinor: 200000, currency: 'EUR', targetDate: '2027-03-31', accountId: 'acc-savings',
    contributions: [
      { id: 'gc-1', date: '2026-06-11', amountMinor: 30000 },
      { id: 'gc-2', date: '2026-07-11', amountMinor: 20000 },
      { id: 'gc-3', date: '2026-08-11', amountMinor: 15000 },
      { id: 'gc-4', date: '2026-09-11', amountMinor: 10000 },
      { id: 'gc-5', date: '2026-10-11', amountMinor: 10000 },
    ] },
  { id: 'goal-emergency', ...meta, name: 'Fondo emergenza', icon: 'Lifebuoy', color: 'teal', targetMinor: 300000, currency: 'EUR', accountId: 'acc-savings',
    contributions: [{ id: 'gc-6', date: '2026-01-15', amountMinor: 190000 }] },
  { id: 'goal-japan', ...meta, name: 'Viaggio in Giappone', icon: 'AirplaneTilt', color: 'olive', targetMinor: 250000, currency: 'EUR', targetDate: '2027-04-01', accountId: 'acc-savings',
    contributions: [
      { id: 'gc-7', date: '2026-09-11', amountMinor: 20000 },
      { id: 'gc-8', date: '2026-10-11', amountMinor: 20000 },
    ] },
];

type Draft = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'tags' | 'isRecurring' | 'currency'> &
  Partial<Pick<Transaction, 'tags' | 'isRecurring'>>;

function weekday(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 Sunday
}

/** Amount between min and max euro, rounded to a plausible price ending. */
function price(rand: () => number, min: number, max: number): number {
  const euros = min + rand() * (max - min);
  const cents = [0, 10, 40, 50, 80, 90, 99][Math.floor(rand() * 7)];
  return Math.round(Math.floor(euros) * 100 + cents);
}

export function createDataset(today: LocalDate = PINNED_TODAY): Dataset {
  const rand = prng(20261024);
  const drafts: Draft[] = [];
  const add = (draft: Draft) => drafts.push(draft);

  for (let date = START; date <= today; date = addDays(date, 1)) {
    const day = dayOfMonth(date);
    const wd = weekday(date);
    const workday = wd >= 1 && wd <= 5;

    if (day === 1) add({ type: 'expense', amountMinor: 55000, date, accountId: 'acc-bank', categoryId: 'cat-home', merchant: 'Affitto', paymentMethod: 'bank_transfer', isRecurring: true, necessity: 'need' });
    if (day === 10) {
      add({ type: 'income', amountMinor: 175000, date, accountId: 'acc-bank', categoryId: 'cat-salary', merchant: 'Stipendio', isRecurring: true });
      add({ type: 'transfer', amountMinor: 70000, date, accountId: 'acc-bank', toAccountId: 'acc-revolut', description: 'Ricarica Revolut' });
    }
    if (day === 11) add({ type: 'transfer', amountMinor: 20000, date, accountId: 'acc-bank', toAccountId: 'acc-savings', description: 'Risparmio del mese' });
    if (day === 20) add({ type: 'expense', amountMinor: 2790, date, accountId: 'acc-bank', categoryId: 'cat-bills', merchant: 'Fibra casa', isRecurring: true, necessity: 'need' });
    if (day === 14 && (date.startsWith('2026-08') || date.startsWith('2026-10'))) {
      add({ type: 'expense', amountMinor: date.startsWith('2026-08') ? 7120 : 7840, date, accountId: 'acc-bank', categoryId: 'cat-bills', merchant: 'Luce e gas', isRecurring: true, necessity: 'need' });
    }

    // Groceries: Esselunga twice a week, Lidl on Saturdays.
    if (wd === 2 || wd === 5) add({ type: 'expense', amountMinor: price(rand, 15, 46), date, accountId: 'acc-revolut', categoryId: 'cat-groceries', merchant: 'Esselunga', necessity: 'need' });
    if (wd === 6 && rand() < 0.7) add({ type: 'expense', amountMinor: price(rand, 11, 29), date, accountId: 'acc-revolut', categoryId: 'cat-groceries', merchant: 'Lidl', necessity: 'need' });

    // Coffee and lunch on workdays.
    if (workday && rand() < 0.65) add({ type: 'expense', amountMinor: rand() < 0.75 ? 150 : 280, date, accountId: 'acc-cash', categoryId: 'cat-restaurants', merchant: 'Bar Centrale', paymentMethod: 'cash', necessity: 'want' });
    if (workday && rand() < 0.2) add({ type: 'expense', amountMinor: price(rand, 6, 10), date, accountId: 'acc-revolut', categoryId: 'cat-restaurants', merchant: 'Panificio Rossi', necessity: 'want' });

    // Dinners out at the weekend.
    if ((wd === 5 || wd === 6) && rand() < 0.25) {
      const place = ['Pizzeria Vesuvio', 'Sushi Ko', 'Osteria del Borgo'][Math.floor(rand() * 3)];
      add({ type: 'expense', amountMinor: price(rand, 16, 30), date, accountId: 'acc-revolut', categoryId: 'cat-restaurants', merchant: place, necessity: 'want' });
    }

    // Transport.
    if ((day === 6 || day === 24) && !date.startsWith('2026-08')) add({ type: 'expense', amountMinor: 1890, date, accountId: 'acc-revolut', categoryId: 'cat-transport', merchant: 'Trenitalia', necessity: 'need' });
    if (day % 11 === 3) add({ type: 'expense', amountMinor: price(rand, 38, 52), date, accountId: 'acc-card', categoryId: 'cat-transport', merchant: 'Distributore Eni', necessity: 'need' });

    // Occasional spending.
    if (day % 13 === 5) add({ type: 'expense', amountMinor: price(rand, 12, 36), date, accountId: 'acc-paypal', categoryId: 'cat-shopping', merchant: 'Amazon', necessity: 'want' });
    if (day === 17) add({ type: 'expense', amountMinor: price(rand, 7, 22), date, accountId: 'acc-revolut', categoryId: 'cat-health', merchant: 'Farmacia San Paolo', necessity: 'need' });
    if (day === 21) add({ type: 'expense', amountMinor: 1500, date, accountId: 'acc-cash', categoryId: 'cat-care', merchant: 'Barbiere', paymentMethod: 'cash' });
    if (wd === 0 && rand() < 0.3) add({ type: 'expense', amountMinor: 950, date, accountId: 'acc-revolut', categoryId: 'cat-leisure', merchant: 'UCI Cinemas', necessity: 'want' });
  }

  // One-off movements that give the months their own character.
  add({ type: 'expense', amountMinor: 18900, date: '2026-08-12', accountId: 'acc-revolut', categoryId: 'cat-travel', merchant: 'Booking.com', description: 'Weekend a Matera', necessity: 'want' });
  add({ type: 'expense', amountMinor: 7999, date: '2026-09-08', accountId: 'acc-paypal', categoryId: 'cat-tech', merchant: 'MediaWorld', description: 'Cuffie', necessity: 'want' });
  add({ type: 'expense', amountMinor: 2999, date: '2026-09-15', accountId: 'acc-paypal', categoryId: 'cat-shopping', merchant: 'Amazon', description: 'Custodia tablet', necessity: 'want' });
  add({ type: 'expense', amountMinor: 3500, date: '2026-09-19', accountId: 'acc-revolut', categoryId: 'cat-gifts', merchant: 'Feltrinelli', description: 'Regalo per Giulia', necessity: 'want' });
  add({ type: 'expense', amountMinor: 3995, date: '2026-09-20', accountId: 'acc-revolut', categoryId: 'cat-shopping', merchant: 'Zara', necessity: 'want' });
  add({ type: 'expense', amountMinor: 6500, date: '2026-09-23', accountId: 'acc-revolut', categoryId: 'cat-education', merchant: 'Libreria universitaria', description: 'Libri del semestre', necessity: 'need' });
  add({ type: 'refund', amountMinor: 2999, date: '2026-10-09', accountId: 'acc-paypal', categoryId: 'cat-shopping', merchant: 'Amazon', description: 'Reso custodia tablet' });
  add({ type: 'expense', amountMinor: 2499, date: '2026-10-16', accountId: 'acc-revolut', categoryId: 'cat-shopping', merchant: 'Decathlon', necessity: 'want' });
  add({
    type: 'expense', amountMinor: 6000, date: '2026-10-18', accountId: 'acc-revolut', categoryId: 'cat-restaurants', merchant: 'Trattoria da Gino',
    description: 'Cena con Mario', paidByPersonId: 'person-me', necessity: 'want',
    split: splitEvenly(6000, ['person-me', 'person-mario']).map((s) => (s.personId === 'person-me' ? { ...s, settled: true } : s)),
  });
  add({
    type: 'expense', amountMinor: 2400, date: '2026-09-26', accountId: 'acc-revolut', categoryId: 'cat-leisure', merchant: 'UCI Cinemas',
    description: 'Cinema con Giulia', paidByPersonId: 'person-giulia',
    split: splitEvenly(2400, ['person-me', 'person-giulia']),
  });

  let n = 0;
  const transactions: Transaction[] = drafts
    .filter((draft) => draft.date <= today)
    .map((draft) => ({ ...meta, tags: [], isRecurring: false, currency: 'EUR', ...draft, id: `tx-${(++n).toString().padStart(4, '0')}` }));

  // Subscription charges come from the real generator, so the prototype exercises it.
  const subscriptions = SUBSCRIPTIONS.map((s) => ({ ...s, nextBillingDate: firstOnOrAfter(s, START) }));
  const generated = generateDueCharges(subscriptions, [], today, { makeId: () => `tx-${(++n).toString().padStart(4, '0')}`, now: STAMP });

  return {
    today,
    currency: 'EUR',
    meId: 'person-me',
    people: PEOPLE,
    accounts: ACCOUNTS,
    categories: CATEGORIES,
    subscriptions: generated.subscriptions,
    budgets: BUDGETS,
    goals: GOALS,
    transactions: [...transactions, ...generated.charges].sort((a, b) => (a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date))),
  };
}

function firstOnOrAfter(subscription: Subscription, date: LocalDate): LocalDate {
  let next = subscription.anchorDate;
  while (next < date) {
    next = generateDueCharges([{ ...subscription, nextBillingDate: next }], [], next, { makeId: () => '', now: STAMP })
      .subscriptions[0].nextBillingDate;
  }
  return next;
}
