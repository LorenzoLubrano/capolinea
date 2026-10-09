import type { Snapshot } from '@/data/repositories';
import type { LocalDate } from '@/domain/types';

import { BACKUP_FORMAT, BACKUP_VERSION } from './export';

export type BackupData = Omit<Snapshot, 'today'>;

export interface BackupSummary {
  exportedAt: string;
  transactions: number;
  accounts: number;
  categories: number;
  subscriptions: number;
  budgets: number;
  goals: number;
  people: number;
  firstDate: LocalDate | null;
  lastDate: LocalDate | null;
}

export type BackupProblem = 'size' | 'json' | 'format' | 'version' | 'shape';
export type ParsedBackup = { ok: true; data: BackupData; summary: BackupSummary } | { ok: false; reason: BackupProblem };

/** 20 MB of JSON is years of movements; anything bigger is not a backup of this app. */
const MAX_BYTES = 20 * 1024 * 1024;

type Check = (value: unknown) => boolean;
const str: Check = (v) => typeof v === 'string';
const id: Check = (v) => typeof v === 'string' && v.length > 0 && v.length <= 200;
const bool: Check = (v) => typeof v === 'boolean';
const int: Check = (v) => Number.isSafeInteger(v);
const amount: Check = (v) => Number.isSafeInteger(v) && (v as number) >= 0;
const num: Check = (v) => typeof v === 'number' && Number.isFinite(v);
const currency: Check = (v) => typeof v === 'string' && /^[A-Z]{3}$/.test(v);
/** A real calendar day, not just its shape: 2026-02-30 is refused. */
const date: Check = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && isRealInstant(`${v}T00:00:00.000Z`, v);
/** When the backup was made: an ISO time the preview can show. */
const timestamp: Check = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) && isRealInstant(v, v.slice(0, 10));

function isRealInstant(text: string, day: string): boolean {
  const time = Date.parse(text);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === day;
}
const month: Check = (v) => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
const oneOf =
  (...values: string[]): Check =>
  (v) =>
    typeof v === 'string' && values.includes(v);
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const listOf =
  (read: (v: unknown) => unknown | null): Check =>
  (v) =>
    Array.isArray(v) && v.every((item) => read(item) !== null);

interface Schema {
  required: Record<string, Check>;
  optional?: Record<string, Check>;
}

/**
 * A record rebuilt from the known fields only, or null if a field is missing or wrong. Unknown
 * fields never get through, whatever their name.
 */
function readRecord(value: unknown, schema: Schema): Record<string, unknown> | null {
  if (!isObject(value)) return null;
  const out: Record<string, unknown> = {};
  for (const [key, check] of Object.entries(schema.required)) {
    if (!Object.hasOwn(value, key) || !check(value[key])) return null;
    out[key] = value[key];
  }
  for (const [key, check] of Object.entries(schema.optional ?? {})) {
    if (!Object.hasOwn(value, key) || value[key] === undefined) continue;
    if (!check(value[key])) return null;
    out[key] = value[key];
  }
  return out;
}

const meta = { id, createdAt: str, updatedAt: str };
const metaOptional = { deletedAt: str, ownerId: id };
const share = (v: unknown) => readRecord(v, { required: { personId: id, amountMinor: amount, settled: bool }, optional: { settledAt: date } });
const contribution = (v: unknown) => readRecord(v, { required: { id, date, amountMinor: amount } });
const frequency = (v: unknown) =>
  readRecord(v, { required: { unit: oneOf('week', 'month', 'year'), interval: (n) => int(n) && (n as number) >= 1 } });

const SCHEMAS: Record<string, Schema> = {
  people: { required: { ...meta, name: str, isMe: bool }, optional: metaOptional },
  accounts: {
    required: {
      ...meta,
      name: str,
      type: oneOf('bank', 'ewallet', 'cash', 'credit_card', 'savings', 'other'),
      currency,
      openingBalanceMinor: int,
      color: str,
      includeInTotal: bool,
      archived: bool,
      sortOrder: num,
    },
    optional: { ...metaOptional, icon: str },
  },
  categories: {
    required: { ...meta, name: str, kind: oneOf('expense', 'income'), icon: str, color: str, isDefault: bool, archived: bool, sortOrder: num },
    optional: { ...metaOptional, parentId: id },
  },
  subscriptions: {
    required: {
      ...meta,
      name: str,
      amountMinor: amount,
      currency,
      frequency: (v) => frequency(v) !== null,
      anchorDate: date,
      nextBillingDate: date,
      startDate: date,
      categoryId: id,
      accountId: id,
      active: bool,
    },
    optional: { ...metaOptional, endDate: date, notes: str },
  },
  budgets: {
    required: { ...meta, scope: oneOf('global', 'category'), amountMinor: amount, currency, fromMonth: month },
    optional: { ...metaOptional, categoryId: id },
  },
  goals: {
    required: { ...meta, name: str, icon: str, color: str, targetMinor: amount, currency, contributions: listOf(contribution) },
    optional: { ...metaOptional, targetDate: date, accountId: id },
  },
  transactions: {
    required: {
      ...meta,
      type: oneOf('expense', 'income', 'transfer', 'refund'),
      amountMinor: amount,
      currency,
      date,
      accountId: id,
      tags: (v) => Array.isArray(v) && v.every(str),
      isRecurring: bool,
    },
    optional: {
      ...metaOptional,
      toAccountId: id,
      categoryId: id,
      subcategoryId: id,
      merchant: str,
      description: str,
      notes: str,
      receiptUri: str,
      paymentMethod: oneOf('card', 'cash', 'bank_transfer', 'wallet', 'other'),
      necessity: oneOf('need', 'want'),
      subscriptionId: id,
      occurrenceDate: date,
      editedAfterGeneration: bool,
      refundOfId: id,
      paidByPersonId: id,
      split: listOf(share),
      settlementWith: id,
    },
  },
};

/** Every reference points at a record of the backup, and exactly one person is the user. */
function consistent(data: BackupData): boolean {
  const accounts = new Set(data.accounts.map((a) => a.id));
  const categories = new Set(data.categories.map((c) => c.id));
  const people = new Set(data.people.map((p) => p.id));
  const me = data.people.filter((p) => p.isMe);
  if (me.length !== 1 || me[0].id !== data.meId) return false;
  const txOk = data.transactions.every(
    (t) =>
      accounts.has(t.accountId) &&
      (!t.toAccountId || accounts.has(t.toAccountId)) &&
      (!t.categoryId || categories.has(t.categoryId)) &&
      (!t.paidByPersonId || people.has(t.paidByPersonId)) &&
      (!t.split || t.split.every((s) => people.has(s.personId))),
  );
  const subsOk = data.subscriptions.every((s) => accounts.has(s.accountId) && categories.has(s.categoryId));
  return txOk && subsOk;
}

/**
 * Reads a backup file without trusting it: size, JSON, format and version first, then every record
 * against its schema and every reference against the records. Nothing is written here.
 */
export function parseBackup(text: string, { maxBytes = MAX_BYTES }: { maxBytes?: number } = {}): ParsedBackup {
  if (text.length > maxBytes) return { ok: false, reason: 'size' };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'json' };
  }
  if (!isObject(raw) || raw.format !== BACKUP_FORMAT) return { ok: false, reason: 'format' };
  if (!int(raw.version) || raw.version !== BACKUP_VERSION) return { ok: false, reason: 'version' };
  const source = raw.data;
  if (!isObject(source) || !timestamp(raw.exportedAt) || !currency(source.currency) || !id(source.meId)) return { ok: false, reason: 'shape' };

  const collections: Record<string, Record<string, unknown>[]> = {};
  for (const [name, schema] of Object.entries(SCHEMAS)) {
    const list = source[name];
    if (!Array.isArray(list)) return { ok: false, reason: 'shape' };
    const records = list.map((item) => readRecord(item, schema));
    if (records.some((r) => r === null)) return { ok: false, reason: 'shape' };
    collections[name] = records as Record<string, unknown>[];
  }
  const data = { currency: source.currency, meId: source.meId, ...collections } as unknown as BackupData;
  if (!consistent(data)) return { ok: false, reason: 'shape' };

  const dates = data.transactions.map((t) => t.date).sort();
  return {
    ok: true,
    data,
    summary: {
      exportedAt: raw.exportedAt as string,
      transactions: data.transactions.length,
      accounts: data.accounts.length,
      categories: data.categories.length,
      subscriptions: data.subscriptions.length,
      budgets: data.budgets.length,
      goals: data.goals.length,
      people: data.people.length,
      firstDate: dates[0] ?? null,
      lastDate: dates[dates.length - 1] ?? null,
    },
  };
}
