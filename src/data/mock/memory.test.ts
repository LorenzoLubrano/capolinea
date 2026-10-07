import { createMemoryRepositories } from './memory';
import { createDataset } from './seed';

describe('memory repositories', () => {
  it('updates a transaction and keeps its identity', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const before = (await repos.snapshot()).transactions.find((t) => t.merchant === 'Esselunga')!;
    const after = await repos.updateTransaction(before.id, { amountMinor: 1234, notes: 'Corretto' });
    expect(after).toMatchObject({ id: before.id, createdAt: before.createdAt, amountMinor: 1234, notes: 'Corretto' });
    expect(after.updatedAt >= before.updatedAt).toBe(true);
    const stored = (await repos.snapshot()).transactions.find((t) => t.id === before.id);
    expect(stored?.amountMinor).toBe(1234);
  });

  it('marks an edited subscription charge, so the generator leaves it alone', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const charge = (await repos.snapshot()).transactions.find((t) => t.subscriptionId)!;
    const after = await repos.updateTransaction(charge.id, { amountMinor: 999 });
    expect(after.editedAfterGeneration).toBe(true);
  });

  it('can clear an optional field', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const withNote = await repos.addTransaction({
      type: 'expense', amountMinor: 100, currency: 'EUR', date: '2026-10-24', accountId: 'acc-cash', tags: [], isRecurring: false, notes: 'x',
    });
    const after = await repos.updateTransaction(withNote.id, { notes: undefined });
    expect('notes' in after && after.notes !== undefined).toBe(false);
  });
});
