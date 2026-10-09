import { createEmptyDataset } from '@/data/defaults';
import type { Snapshot } from '@/data/repositories';
import { subscription, tx } from '@/domain/testing/builders';
import { formatMoney } from '@/services/format/money';
import { DEFAULT_NOTIFICATIONS, type NotificationRules } from '@/state/settings';

import { planNotifications } from './plan';

const TODAY = '2026-10-24'; // a Saturday
const MORNING = new Date(2026, 9, 24, 10, 0);
const RULES: NotificationRules = { ...DEFAULT_NOTIFICATIONS, subscriptionSoon: true, subscriptionDaysBefore: 1, eveningReminder: false };

function data(changes: Partial<Snapshot>): Snapshot {
  return { ...createEmptyDataset(TODAY), ...changes };
}

const netflix = subscription({ id: 'sub-netflix', name: 'Netflix', amountMinor: 1399, nextBillingDate: '2026-10-31' });

describe('planNotifications: charges on the way', () => {
  it('announces a charge the day before at 9, with name, amount and day', () => {
    const planned = planNotifications(data({ subscriptions: [netflix] }), RULES, { privacy: false, now: MORNING });

    expect(planned).toEqual([
      { id: 'subscription:sub-netflix:2026-10-31', at: new Date(2026, 9, 30, 9, 0), title: 'Addebito in arrivo', body: `Netflix, ${formatMoney(1399, 'EUR')}, domani.` },
    ]);
  });

  it('names the weekday when the notice comes earlier', () => {
    const planned = planNotifications(data({ subscriptions: [netflix] }), { ...RULES, subscriptionDaysBefore: 3 }, { privacy: false, now: MORNING });

    expect(planned[0]).toMatchObject({ at: new Date(2026, 9, 28, 9, 0), body: `Netflix, ${formatMoney(1399, 'EUR')}, sabato.` });
  });

  it('shows no figure with privacy on', () => {
    const [notice] = planNotifications(data({ subscriptions: [netflix] }), RULES, { privacy: true, now: MORNING });

    expect(notice.body).toBe('Netflix si rinnova a breve.');
  });

  it('skips paused and ended subscriptions, and notices whose time has passed', () => {
    const subscriptions = [
      subscription({ id: 'sub-paused', nextBillingDate: '2026-10-30', active: false }),
      subscription({ id: 'sub-ended', nextBillingDate: '2026-10-30', endDate: '2026-10-29' }),
      // Charged tomorrow: the notice was due this morning at 9.
      subscription({ id: 'sub-tomorrow', nextBillingDate: '2026-10-25' }),
    ];

    expect(planNotifications(data({ subscriptions }), RULES, { privacy: false, now: MORNING })).toEqual([]);
  });

  it('sends nothing when the rule is off', () => {
    expect(planNotifications(data({ subscriptions: [netflix] }), { ...RULES, subscriptionSoon: false }, { privacy: false, now: MORNING })).toEqual([]);
  });
});

describe('planNotifications: evening reminder', () => {
  const evening = { ...RULES, subscriptionSoon: false, eveningReminder: true };

  it('reminds at 21 on this evening and the next six', () => {
    const planned = planNotifications(data({}), evening, { privacy: false, now: MORNING });

    expect(planned.map((n) => n.id)).toEqual([
      'evening:2026-10-24', 'evening:2026-10-25', 'evening:2026-10-26', 'evening:2026-10-27',
      'evening:2026-10-28', 'evening:2026-10-29', 'evening:2026-10-30',
    ]);
    expect(planned[0]).toMatchObject({ at: new Date(2026, 9, 24, 21, 0), title: 'Oggi niente spese?' });
  });

  it('leaves this evening out once something was entered today, whatever its date', () => {
    const entered = tx({ date: '2026-10-20', createdAt: new Date(2026, 9, 24, 8, 30).toISOString() });

    const planned = planNotifications(data({ transactions: [entered] }), evening, { privacy: false, now: MORNING });

    expect(planned[0].id).toBe('evening:2026-10-25');
    expect(planned).toHaveLength(6);
  });

  it('starts from tomorrow after 21', () => {
    const planned = planNotifications(data({}), evening, { privacy: false, now: new Date(2026, 9, 24, 21, 30) });

    expect(planned[0].id).toBe('evening:2026-10-25');
  });
});
