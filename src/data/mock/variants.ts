import { addDays, monthEnd, monthStart, toLocalDate } from '@/domain/dates';
import { splitEvenly } from '@/domain/splits';
import { spendingBetween } from '@/domain/spending';
import { generateDueCharges } from '@/domain/subscriptions';
import type { Account, Budget, Category, Goal, Id, LocalDate, Person, Subscription, Transaction } from '@/domain/types';

import { createEmptyDataset } from '../defaults';
import { createDataset, PINNED_TODAY, type Dataset } from './seed';

/**
 * The data the prototype panel can load: the full example, the same without income, extreme values
 * to break the layout, or a first launch. Synthetic and deterministic, like the example itself.
 */

export type DatasetKind = 'full' | 'noIncome' | 'edge' | 'empty';

/** The prototype's "today": pinned in October 2026, at either end of that month, or the real one. */
export type FakeDate = 'pinned' | 'monthStart' | 'monthEnd' | 'real';

export function resolveFakeDate(date: FakeDate, now: Date): LocalDate {
  if (date === 'real') return toLocalDate(now);
  if (date === 'monthStart') return monthStart(PINNED_TODAY);
  if (date === 'monthEnd') return monthEnd(PINNED_TODAY);
  return PINNED_TODAY;
}

const isIncome = (t: Transaction) => t.type === 'income' && !t.settlementWith;

/**
 * Someone who records only what they spend. The income moves into the opening balances, so the
 * balances of today stay the same and only the missing income changes the screens.
 */
export function withoutIncome(data: Dataset): Dataset {
  const moved = new Map<Id, number>();
  for (const t of data.transactions) {
    if (isIncome(t) && !t.deletedAt) moved.set(t.accountId, (moved.get(t.accountId) ?? 0) + t.amountMinor);
  }
  return {
    ...data,
    accounts: data.accounts.map((a) => ({ ...a, openingBalanceMinor: a.openingBalanceMinor + (moved.get(a.id) ?? 0) })),
    transactions: data.transactions.filter((t) => !isIncome(t)),
  };
}

const LONG = {
  account: "Conto cointestato Banca Popolare dell'Emilia Romagna",
  category: 'Manutenzione straordinaria della casa al mare in Liguria',
  person: 'Maria Vittoria Benedetta Scarpellini De Santis',
  merchant: 'Concessionaria Autosalone Lombardo Veneto S.r.l. – Filiale di Bergamo',
  subscription: 'Quotidiano digitale con archivio storico e inserti del weekend',
  goal: 'Casa al mare in Liguria con terrazzo vista golfo',
};

/** Small spending that crowds a single day. */
const CROWD: [merchant: string, amountMinor: number, categoryId: Id][] = [
  ['Bar Centrale', 150, 'cat-restaurants'],
  ['Edicola Duomo', 250, 'cat-other'],
  ['Distributore automatico', 120, 'cat-restaurants'],
  ['Panificio Rossi', 340, 'cat-restaurants'],
  ['Bar Centrale', 280, 'cat-restaurants'],
  ['Gelateria Pagani', 450, 'cat-restaurants'],
  ['Parcheggio Piazza Cavour', 300, 'cat-transport'],
  ['Distributore automatico', 120, 'cat-restaurants'],
  ['Pasticceria Marchesi', 420, 'cat-restaurants'],
  ['Bar Centrale', 150, 'cat-restaurants'],
  ['Tabaccheria 23', 1200, 'cat-other'],
  ['Lavanderia Bolle Blu', 650, 'cat-care'],
];

type Draft = Omit<Transaction, 'id' | 'createdAt' | 'updatedAt' | 'currency' | 'tags' | 'isRecurring'> & Partial<Pick<Transaction, 'tags'>>;

/**
 * The example data plus the extremes a screen has to survive: names longer than a row, a balance
 * over a million and one below zero, one cent and fifty thousand euro, a day with twenty movements,
 * a dinner split eight ways, budgets blown or used to the cent, goals reached, overshot or late.
 */
export function createEdgeDataset(today: LocalDate): Dataset {
  const base = createDataset(today);
  const stamp = `${today}T08:00:00Z`;
  const meta = { createdAt: stamp, updatedAt: stamp };
  const daysAgo = (days: number) => addDays(today, -days);
  let n = 0;
  const nextId = () => `tx-edge-${String(++n).padStart(3, '0')}`;
  const tx = (draft: Draft): Transaction => ({ ...meta, currency: 'EUR', tags: [], isRecurring: false, ...draft, id: nextId() });

  const people: Person[] = [
    ...base.people,
    { id: 'person-long', ...meta, name: LONG.person, isMe: false },
    ...['Anna', 'Carlo', 'Elena', 'Francesco'].map((name) => ({ id: `person-${name.toLowerCase()}`, ...meta, name, isMe: false })),
  ];

  const accounts: Account[] = [
    ...base.accounts,
    { id: 'acc-joint', ...meta, name: LONG.account, type: 'bank', currency: 'EUR', openingBalanceMinor: 123_456_789, color: 'teal', includeInTotal: true, archived: false, sortOrder: 6 },
    { id: 'acc-amex', ...meta, name: 'Amex', type: 'credit_card', currency: 'EUR', openingBalanceMinor: 0, color: 'plum', includeInTotal: true, archived: false, sortOrder: 7 },
  ];

  const categories: Category[] = [
    ...base.categories,
    { id: 'cat-long', ...meta, name: LONG.category, kind: 'expense', icon: 'House', color: 'brown', isDefault: false, archived: false, sortOrder: 15 },
  ];

  const extremes: Transaction[] = [
    tx({
      type: 'expense', amountMinor: 4_999_999, date: today, accountId: 'acc-amex', categoryId: 'cat-transport', merchant: LONG.merchant,
      description: "Anticipo per l'auto nuova, con permuta della vecchia, immatricolazione e messa su strada",
      notes: 'Il resto a rate: ventiquattro mesi a tasso zero, prima rata a gennaio. Disdire la vecchia assicurazione prima del passaggio di proprietà.',
      tags: ['auto', 'grande spesa', 'da rateizzare'], necessity: 'need',
    }),
    tx({ type: 'expense', amountMinor: 1, date: today, accountId: 'acc-revolut', categoryId: 'cat-other', merchant: 'Arrotondamento' }),
    tx({ type: 'expense', amountMinor: 2340, date: today, accountId: 'acc-card', merchant: 'POS 4402 ***1234 MILANO IT' }),
    tx({
      type: 'expense', amountMinor: 48_000, date: today, accountId: 'acc-revolut', categoryId: 'cat-restaurants', merchant: 'Ristorante La Pergola',
      description: 'Cena di classe', paidByPersonId: 'person-me', necessity: 'want',
      split: splitEvenly(48_000, people.map((p) => p.id)).map((s) => (s.personId === 'person-me' ? { ...s, settled: true } : s)),
    }),
    tx({
      type: 'expense', amountMinor: 15_600, date: today, accountId: 'acc-revolut', categoryId: 'cat-leisure', merchant: 'Ticketone',
      description: 'Concerto a San Siro', paidByPersonId: 'person-long', split: splitEvenly(15_600, ['person-me', 'person-long']),
    }),
    tx({ type: 'refund', amountMinor: 32_000, date: today, accountId: 'acc-revolut', categoryId: 'cat-travel', merchant: 'Volotea', description: 'Rimborso del volo cancellato' }),
    tx({ type: 'expense', amountMinor: 8750, date: daysAgo(2), accountId: 'acc-joint', categoryId: 'cat-long', merchant: 'Bricoman', description: 'Vernice e pennelli' }),
    ...CROWD.map(([merchant, amountMinor, categoryId]) =>
      tx({ type: 'expense', amountMinor, date: today, accountId: 'acc-cash', categoryId, merchant, paymentMethod: 'cash' }),
    ),
  ];

  const subscription = (fields: Omit<Subscription, 'createdAt' | 'updatedAt' | 'currency' | 'startDate' | 'nextBillingDate'>): Subscription => ({
    ...meta, currency: 'EUR', startDate: fields.anchorDate, nextBillingDate: fields.anchorDate, ...fields,
  });
  const generated = generateDueCharges(
    [
      subscription({ id: 'sub-long', name: LONG.subscription, amountMinor: 12_999, frequency: { unit: 'year', interval: 1 }, anchorDate: today, categoryId: 'cat-education', accountId: 'acc-joint', active: true }),
      subscription({ id: 'sub-weekly', name: 'Giornale', amountMinor: 250, frequency: { unit: 'week', interval: 1 }, anchorDate: daysAgo(21), categoryId: 'cat-other', accountId: 'acc-cash', active: true }),
      subscription({ id: 'sub-paused', name: 'Disney+', amountMinor: 899, frequency: { unit: 'month', interval: 1 }, anchorDate: '2026-05-12', categoryId: 'cat-subscriptions', accountId: 'acc-revolut', active: false }),
    ],
    [],
    today,
    { makeId: nextId, now: stamp },
  );

  const transactions = [...base.transactions, ...extremes, ...generated.charges].sort((a, b) =>
    a.date === b.date ? a.id.localeCompare(b.id) : a.date.localeCompare(b.date),
  );

  // Personal care gets a budget equal to what it already took this month: used to the cent.
  const careSpent = spendingBetween(transactions, monthStart(today), today, { currency: 'EUR', meId: base.meId, categoryId: 'cat-care' });
  const budget = (id: Id, categoryId: Id, amountMinor: number): Budget => ({
    id, ...meta, scope: 'category', categoryId, amountMinor, currency: 'EUR', fromMonth: '2026-08',
  });

  const goals: Goal[] = [
    ...base.goals,
    { id: 'goal-reached', ...meta, name: 'Bici da corsa', icon: 'Bicycle', color: 'green', targetMinor: 120_000, currency: 'EUR', accountId: 'acc-savings',
      contributions: [{ id: 'gc-edge-1', date: daysAgo(90), amountMinor: 70_000 }, { id: 'gc-edge-2', date: daysAgo(20), amountMinor: 50_000 }] },
    { id: 'goal-over', ...meta, name: 'Regali di Natale', icon: 'Gift', color: 'plum', targetMinor: 30_000, currency: 'EUR', targetDate: '2026-12-20', accountId: 'acc-savings',
      contributions: [{ id: 'gc-edge-3', date: daysAgo(40), amountMinor: 20_000 }, { id: 'gc-edge-4', date: daysAgo(5), amountMinor: 15_000 }] },
    { id: 'goal-late', ...meta, name: 'Corso di fotografia', icon: 'Camera', color: 'orange', targetMinor: 90_000, currency: 'EUR', targetDate: daysAgo(30), accountId: 'acc-savings',
      contributions: [{ id: 'gc-edge-5', date: daysAgo(120), amountMinor: 20_000 }] },
    { id: 'goal-huge', ...meta, name: LONG.goal, icon: 'House', color: 'sky', targetMinor: 50_000_000, currency: 'EUR', targetDate: '2040-12-31', accountId: 'acc-joint',
      contributions: [{ id: 'gc-edge-6', date: daysAgo(3), amountMinor: 100 }] },
  ];

  return {
    ...base,
    people,
    accounts,
    categories,
    subscriptions: [...base.subscriptions, ...generated.subscriptions],
    budgets: [
      ...base.budgets,
      budget('budget-care', 'cat-care', careSpent > 0 ? careSpent : 1500),
      budget('budget-travel', 'cat-travel', 20_000),
      budget('budget-long', 'cat-long', 5000),
    ],
    goals,
    transactions,
  };
}

/** The data for a choice of the prototype panel, on the chosen day. */
export function prototypeDataset(kind: DatasetKind, today: LocalDate): Dataset {
  if (kind === 'empty') return createEmptyDataset(today);
  if (kind === 'edge') return createEdgeDataset(today);
  const full = createDataset(today);
  return kind === 'noIncome' ? withoutIncome(full) : full;
}
