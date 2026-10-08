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

describe('memory repositories: budgets, subscriptions, goals', () => {
  it('creates, updates and deletes a budget', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const created = await repos.saveBudget({ scope: 'category', categoryId: 'cat-tech', amountMinor: 5000, currency: 'EUR', fromMonth: '2026-10' });
    await repos.saveBudget({ ...created, amountMinor: 6000 });
    expect((await repos.snapshot()).budgets.find((b) => b.id === created.id)?.amountMinor).toBe(6000);
    await repos.deleteBudget(created.id);
    expect((await repos.snapshot()).budgets.some((b) => b.id === created.id)).toBe(false);
    await repos.restoreBudget(created.id);
    expect((await repos.snapshot()).budgets.some((b) => b.id === created.id)).toBe(true);
  });

  it('moves the next charge of a subscription and can pause it', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const { subscription } = await repos.updateSubscription('sub-netflix', { amountMinor: 1599, anchorDate: '2026-12-01' });
    expect(subscription).toMatchObject({ amountMinor: 1599, anchorDate: '2026-12-01', nextBillingDate: '2026-12-01' });
    const paused = await repos.updateSubscription('sub-netflix', { active: false });
    expect(paused.subscription.active).toBe(false);
  });

  it('resumes a paused subscription from today, without charges for the pause', async () => {
    const dataset = createDataset();
    // Paused since August: no Netflix charge in September and October.
    const paused = dataset.subscriptions.map((s) => (s.id === 'sub-netflix' ? { ...s, active: false, nextBillingDate: '2026-09-05' } : s));
    const transactions = dataset.transactions.filter((t) => !(t.subscriptionId === 'sub-netflix' && t.date >= '2026-09-01'));
    const repos = createMemoryRepositories({ ...dataset, subscriptions: paused, transactions }, 0);
    const before = (await repos.snapshot()).transactions.filter((t) => t.subscriptionId === 'sub-netflix').length;
    const { subscription, generated } = await repos.updateSubscription('sub-netflix', { active: true });
    expect(generated).toBe(0);
    expect(subscription.nextBillingDate).toBe('2026-11-05');
    expect((await repos.snapshot()).transactions.filter((t) => t.subscriptionId === 'sub-netflix')).toHaveLength(before);
  });

  it('deletes a subscription but keeps its past charges', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    await repos.deleteSubscription('sub-spotify');
    const snapshot = await repos.snapshot();
    expect(snapshot.subscriptions.some((s) => s.id === 'sub-spotify')).toBe(false);
    expect(snapshot.transactions.filter((t) => t.subscriptionId === 'sub-spotify')).toHaveLength(3);
    await repos.restoreSubscription('sub-spotify');
    expect((await repos.snapshot()).subscriptions.some((s) => s.id === 'sub-spotify')).toBe(true);
  });

  it('saves a goal and records contributions', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const goal = await repos.saveGoal({ name: 'Bici', icon: 'Bicycle', color: 'green', targetMinor: 60000, currency: 'EUR' });
    expect(goal.contributions).toEqual([]);
    const after = await repos.addContribution(goal.id, { date: '2026-10-24', amountMinor: 5000 });
    expect(after.contributions.map((c) => c.amountMinor)).toEqual([5000]);
    const renamed = await repos.saveGoal({ ...after, name: 'Bici da corsa' });
    expect(renamed.contributions).toHaveLength(1);
    const removed = await repos.removeContribution(goal.id, after.contributions[0].id);
    expect(removed.contributions).toEqual([]);
    await repos.deleteGoal(goal.id);
    expect((await repos.snapshot()).goals.some((g) => g.id === goal.id)).toBe(false);
    await repos.restoreGoal(goal.id);
    expect((await repos.snapshot()).goals.some((g) => g.id === goal.id)).toBe(true);
  });
});

describe('memory repositories: accounts, categories, people', () => {
  it('creates, edits, deletes and restores an account', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const created = await repos.saveAccount({
      name: 'Satispay', type: 'ewallet', currency: 'EUR', openingBalanceMinor: 2500, color: 'teal', includeInTotal: true, archived: false, sortOrder: 6,
    });
    await repos.saveAccount({ ...created, name: 'Satispay personale', archived: true });
    expect((await repos.snapshot()).accounts.find((a) => a.id === created.id)).toMatchObject({ name: 'Satispay personale', archived: true, createdAt: created.createdAt });
    await repos.deleteAccount(created.id);
    expect((await repos.snapshot()).accounts.some((a) => a.id === created.id)).toBe(false);
    await repos.restoreAccount(created.id);
    expect((await repos.snapshot()).accounts.some((a) => a.id === created.id)).toBe(true);
  });

  it('creates, edits, deletes and restores a category', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const created = await repos.saveCategory({ name: 'Animali', kind: 'expense', icon: 'Heart', color: 'orange', isDefault: false, archived: false, sortOrder: 15 });
    await repos.saveCategory({ ...created, name: 'Gatto' });
    expect((await repos.snapshot()).categories.find((c) => c.id === created.id)?.name).toBe('Gatto');
    await repos.deleteCategory(created.id);
    expect((await repos.snapshot()).categories.some((c) => c.id === created.id)).toBe(false);
    await repos.restoreCategory(created.id);
    expect((await repos.snapshot()).categories.some((c) => c.id === created.id)).toBe(true);
  });

  it('renames, deletes and restores a person', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const sara = await repos.addPerson('Sara');
    await repos.updatePerson(sara.id, 'Sara B.');
    expect((await repos.snapshot()).people.find((p) => p.id === sara.id)?.name).toBe('Sara B.');
    await repos.deletePerson(sara.id);
    expect((await repos.snapshot()).people.some((p) => p.id === sara.id)).toBe(false);
    await repos.restorePerson(sara.id);
    expect((await repos.snapshot()).people.some((p) => p.id === sara.id)).toBe(true);
  });

  it('settles with a person, records the payment on an account, and can undo it', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const record = await repos.settleWith('person-mario', { date: '2026-10-24', accountId: 'acc-cash', description: 'Saldo con Mario' });
    expect(record.amountMinor).toBe(3000);
    let snapshot = await repos.snapshot();
    const dinner = snapshot.transactions.find((t) => t.description === 'Cena con Mario')!;
    expect(dinner.split!.find((s) => s.personId === 'person-mario')).toMatchObject({ settled: true, settledAt: '2026-10-24' });
    const payment = snapshot.transactions.find((t) => t.id === record.transactionId)!;
    expect(payment).toMatchObject({ type: 'income', amountMinor: 3000, accountId: 'acc-cash', settlementWith: 'person-mario', date: '2026-10-24' });

    await repos.undoSettle(record);
    snapshot = await repos.snapshot();
    expect(snapshot.transactions.find((t) => t.id === dinner.id)!.split!.find((s) => s.personId === 'person-mario')?.settled).toBe(false);
    expect(snapshot.transactions.some((t) => t.id === record.transactionId)).toBe(false);
  });

  it('records what the user pays back as an expense that is a settlement', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const record = await repos.settleWith('person-giulia', { date: '2026-10-24', accountId: 'acc-revolut', description: 'Saldo con Giulia' });
    expect(record.amountMinor).toBe(-1200);
    const payment = (await repos.snapshot()).transactions.find((t) => t.id === record.transactionId);
    expect(payment).toMatchObject({ type: 'expense', amountMinor: 1200, settlementWith: 'person-giulia' });
  });

  it('can settle without recording a payment', async () => {
    const repos = createMemoryRepositories(createDataset(), 0);
    const record = await repos.settleWith('person-mario', { date: '2026-10-24' });
    expect(record.transactionId).toBeUndefined();
  });
});
