import { createDataset } from '@/data/mock/seed';

import { buildBackup } from './export';
import { parseBackup } from './restore';

const data = createDataset();
const text = buildBackup(data, '2026-10-24T18:00:00.000Z');
const edit = (change: (backup: any) => void) => {
  const backup = JSON.parse(text);
  change(backup);
  return JSON.stringify(backup);
};

describe('parseBackup', () => {
  it('reads back a backup made by the app, with a summary for the preview', () => {
    const result = parseBackup(text);
    if (!result.ok) throw new Error(result.reason);
    expect(result.data.transactions).toEqual(data.transactions);
    expect(result.data.accounts).toEqual(data.accounts);
    expect(result.data.meId).toBe(data.meId);
    expect(result.summary).toMatchObject({
      exportedAt: '2026-10-24T18:00:00.000Z',
      transactions: data.transactions.length,
      accounts: data.accounts.length,
      firstDate: '2026-08-01',
      lastDate: '2026-10-24',
    });
  });

  it('says why a file cannot be used', () => {
    expect(parseBackup('{ not json')).toEqual({ ok: false, reason: 'json' });
    expect(parseBackup(JSON.stringify({ hello: 'world' }))).toEqual({ ok: false, reason: 'format' });
    expect(parseBackup(edit((b) => (b.version = 2)))).toEqual({ ok: false, reason: 'version' });
    expect(parseBackup(text, { maxBytes: 100 })).toEqual({ ok: false, reason: 'size' });
  });

  it('refuses records that would break the app', () => {
    expect(parseBackup(edit((b) => (b.data.transactions[0].amountMinor = 12.5))).ok).toBe(false);
    expect(parseBackup(edit((b) => (b.data.transactions[0].date = '24/10/2026'))).ok).toBe(false);
    expect(parseBackup(edit((b) => (b.data.transactions[0].accountId = 'acc-missing'))).ok).toBe(false);
    expect(parseBackup(edit((b) => (b.data.people = b.data.people.filter((p: { isMe: boolean }) => !p.isMe)))).ok).toBe(false);
    expect(parseBackup(edit((b) => delete b.data.categories)).ok).toBe(false);
  });

  it('keeps only the fields the app knows', () => {
    // `__proto__` written in the JSON text, the way a crafted file would carry it.
    const crafted = edit((b) => (b.data.transactions[0].injected = '<script>')).replace(
      `"id":"${data.accounts[0].id}"`,
      `"__proto__":{"admin":true},"id":"${data.accounts[0].id}"`,
    );
    expect(crafted).toContain('"__proto__"');
    const result = parseBackup(crafted);
    if (!result.ok) throw new Error(result.reason);
    expect('injected' in result.data.transactions[0]).toBe(false);
    expect(Object.getPrototypeOf(result.data.accounts[0])).toBe(Object.prototype);
    expect((result.data.accounts[0] as unknown as { admin?: boolean }).admin).toBeUndefined();
  });
});
