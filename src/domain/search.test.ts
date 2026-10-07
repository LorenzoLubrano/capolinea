import { searchTransactions, type SearchContext } from './search';
import { tx } from './testing/builders';
import type { Account, Category } from './types';

const meta = { createdAt: '2026-08-01T08:00:00Z', updatedAt: '2026-08-01T08:00:00Z' };
const categories: Category[] = [
  { ...meta, id: 'cat-restaurants', name: 'Ristoranti', kind: 'expense', icon: 'ForkKnife', color: 'yellow', isDefault: true, archived: false, sortOrder: 1 },
  { ...meta, id: 'cat-groceries', name: 'Spesa alimentare', kind: 'expense', icon: 'ShoppingCart', color: 'green', isDefault: true, archived: false, sortOrder: 0 },
];
const accounts: Account[] = [
  { ...meta, id: 'acc-revolut', name: 'Revolut', type: 'ewallet', currency: 'EUR', openingBalanceMinor: 0, color: 'blue', includeInTotal: true, archived: false, sortOrder: 0 },
  { ...meta, id: 'acc-cash', name: 'Contanti', type: 'cash', currency: 'EUR', openingBalanceMinor: 0, color: 'grey', includeInTotal: true, archived: false, sortOrder: 1 },
];
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const ctx: SearchContext = { categories, accounts, monthNames: MONTHS };

const esselunga = tx({ merchant: 'Esselunga', categoryId: 'cat-groceries', amountMinor: 4280, date: '2026-10-22' });
const amazonSept = tx({ merchant: 'Amazon', amountMinor: 2999, date: '2026-09-14', notes: 'Cavo USB-C', tags: ['casa'] });
const amazonOct = tx({ merchant: 'Amazon', amountMinor: 2950, date: '2026-10-03' });
const coffee = tx({ merchant: 'Caffè Napoli', categoryId: 'cat-restaurants', amountMinor: 150, date: '2026-10-21', accountId: 'acc-cash' });
const all = [esselunga, amazonSept, amazonOct, coffee];

const ids = (query: string) => searchTransactions(all, query, ctx).map((t) => t.id);

describe('searchTransactions', () => {
  it('returns everything for an empty query', () => {
    expect(ids('  ')).toEqual(all.map((t) => t.id));
  });

  it('finds part of a merchant name, ignoring case', () => {
    expect(ids('esse')).toEqual([esselunga.id]);
  });

  it('ignores accents', () => {
    expect(ids('caffe')).toEqual([coffee.id]);
  });

  it('finds the category and the account by name', () => {
    expect(ids('ristoranti')).toEqual([coffee.id]);
    expect(ids('contanti')).toEqual([coffee.id]);
  });

  it('finds a month by name', () => {
    expect(ids('settembre')).toEqual([amazonSept.id]);
  });

  it('finds an exact amount with comma or dot', () => {
    expect(ids('29,99')).toEqual([amazonSept.id]);
    expect(ids('29.99')).toEqual([amazonSept.id]);
  });

  it('finds whole euros', () => {
    expect(ids('29')).toEqual([amazonSept.id, amazonOct.id]);
  });

  it('searches notes and tags', () => {
    expect(ids('usb')).toEqual([amazonSept.id]);
    expect(ids('casa')).toEqual([amazonSept.id]);
  });

  it('requires every word to match', () => {
    expect(ids('amazon ottobre')).toEqual([amazonOct.id]);
    expect(ids('amazon esselunga')).toEqual([]);
  });
});
