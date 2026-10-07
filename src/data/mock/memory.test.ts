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

describe('memory repositories: subscriptions and people', () => {
  const draft = {
    name: 'Disney+',
    amountMinor: 899,
    currency: 'EUR',
    frequency: { unit: 'month' as const, interval: 1 },
    anchorDate: '2026-08-10',
    categoryId: 'cat-subscriptions',
    accountId: 'acc-revolut',
    active: true,
  };

  it('adds a subscription and creates the charges already due, once', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const { subscription, generated } = await repos.addSubscription(draft);
    expect(generated).toBe(3);
    expect(subscription.nextBillingDate).toBe('2026-11-10');
    const charges = (await repos.snapshot()).transactions.filter((t) => t.subscriptionId === subscription.id);
    expect(charges.map((t) => t.date)).toEqual(['2026-08-10', '2026-09-10', '2026-10-10']);
  });

  it('creates no charge for a subscription that starts later', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const { subscription, generated } = await repos.addSubscription({ ...draft, anchorDate: '2026-11-02' });
    expect(generated).toBe(0);
    expect(subscription.nextBillingDate).toBe('2026-11-02');
  });

  it('adds a person', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const person = await repos.addPerson('Sara');
    expect(person).toMatchObject({ name: 'Sara', isMe: false });
    expect((await repos.snapshot()).people.map((p) => p.name)).toContain('Sara');
  });
});
