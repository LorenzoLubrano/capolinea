import { ENTRY_MEMORY_MS, rememberedEntry } from './entry-session';

describe('rememberedEntry', () => {
  const last = { date: '2026-10-23', accountId: 'acc-cash', at: 1_000_000 };

  it('proposes the last date and account for an evening of entries', () => {
    expect(rememberedEntry(last, last.at + 10 * 60 * 1000)).toEqual({ date: '2026-10-23', accountId: 'acc-cash' });
  });

  it('forgets them after a while, so the next day starts from today', () => {
    expect(rememberedEntry(last, last.at + ENTRY_MEMORY_MS)).toBeNull();
    expect(rememberedEntry(null, last.at)).toBeNull();
  });
});
