import { subscription, tx } from './testing/builders';
import { chargesBetween, generateDueCharges, occurrenceAfter } from './subscriptions';

describe('occurrenceAfter', () => {
  it('keeps day 31 in long months after a short one', () => {
    const monthly = { unit: 'month', interval: 1 } as const;
    expect(occurrenceAfter('2026-01-31', monthly, '2026-01-31')).toBe('2026-02-28');
    expect(occurrenceAfter('2026-01-31', monthly, '2026-02-28')).toBe('2026-03-31');
  });

  it('handles weekly, quarterly and yearly frequencies', () => {
    expect(occurrenceAfter('2026-10-05', { unit: 'week', interval: 1 }, '2026-10-20')).toBe('2026-10-26');
    expect(occurrenceAfter('2026-01-15', { unit: 'month', interval: 3 }, '2026-04-15')).toBe('2026-07-15');
    expect(occurrenceAfter('2024-02-29', { unit: 'year', interval: 1 }, '2026-01-01')).toBe('2026-02-28');
  });
});

describe('chargesBetween', () => {
  it('lists the billing dates inside the range', () => {
    const gym = subscription({ anchorDate: '2026-01-28', startDate: '2026-01-28', nextBillingDate: '2026-10-28' });
    expect(chargesBetween(gym, '2026-10-25', '2026-11-30')).toEqual(['2026-10-28', '2026-11-28']);
  });

  it('stops at the end date and skips inactive subscriptions', () => {
    const ending = subscription({ anchorDate: '2026-01-10', startDate: '2026-01-10', endDate: '2026-10-31' });
    expect(chargesBetween(ending, '2026-10-01', '2026-12-31')).toEqual(['2026-10-10']);
    expect(chargesBetween(subscription({ active: false }), '2026-10-01', '2026-12-31')).toEqual([]);
  });
});

describe('generateDueCharges', () => {
  const now = '2026-10-24T07:00:00Z';
  let n = 0;
  const makeId = () => `gen-${++n}`;

  it('creates the charges due up to today, linked to the subscription', () => {
    const spotify = subscription({ id: 'sub-spotify', anchorDate: '2026-01-23', nextBillingDate: '2026-10-23' });
    const result = generateDueCharges([spotify], [], '2026-10-24', { makeId, now });

    expect(result.charges).toHaveLength(1);
    expect(result.charges[0]).toMatchObject({
      type: 'expense',
      amountMinor: 1099,
      date: '2026-10-23',
      subscriptionId: 'sub-spotify',
      occurrenceDate: '2026-10-23',
      categoryId: 'cat-subscriptions',
      accountId: 'acc-revolut',
      isRecurring: true,
      merchant: 'Spotify',
    });
    expect(result.subscriptions[0].nextBillingDate).toBe('2026-11-23');
  });

  it('catches up on months missed while the app was closed', () => {
    const netflix = subscription({ anchorDate: '2026-01-05', nextBillingDate: '2026-08-05' });
    const result = generateDueCharges([netflix], [], '2026-10-24', { makeId, now });
    expect(result.charges.map((c) => c.date)).toEqual(['2026-08-05', '2026-09-05', '2026-10-05']);
    expect(result.subscriptions[0].nextBillingDate).toBe('2026-11-05');
  });

  it('never duplicates a charge that already exists', () => {
    const spotify = subscription({ id: 'sub-spotify', nextBillingDate: '2026-10-23' });
    const existing = [tx({ subscriptionId: 'sub-spotify', occurrenceDate: '2026-10-23', amountMinor: 999 })];
    const result = generateDueCharges([spotify], existing, '2026-10-24', { makeId, now });
    expect(result.charges).toEqual([]);
    expect(result.subscriptions[0].nextBillingDate).toBe('2026-11-23');
  });

  it('does nothing before the billing date or after the end date', () => {
    const later = subscription({ nextBillingDate: '2026-10-28' });
    const ended = subscription({ nextBillingDate: '2026-10-10', endDate: '2026-09-30' });
    const result = generateDueCharges([later, ended], [], '2026-10-24', { makeId, now });
    expect(result.charges).toEqual([]);
  });
});
