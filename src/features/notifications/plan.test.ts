import { createEmptyDataset } from '@/data/defaults';
import { createDataset } from '@/data/mock/seed';
import type { Snapshot } from '@/data/repositories';
import { subscription, tx } from '@/domain/testing/builders';
import { buildAnalysis } from '@/features/analytics/analysis';
import { buildBudgetOverview } from '@/features/budget/overview';
import { formatMoney } from '@/services/format/money';
import { DEFAULT_NOTIFICATIONS, type NotificationRules } from '@/state/settings';

import { planNotifications } from './plan';

const TODAY = '2026-10-24'; // a Saturday
const MORNING = new Date(2026, 9, 24, 10, 0);
/** Every rule off but the charges on the way: each test turns on what it looks at. */
const RULES: NotificationRules = {
  ...DEFAULT_NOTIFICATIONS,
  budgetNear: false,
  budgetOver: false,
  subscriptionSoon: true,
  subscriptionDaysBefore: 1,
  chargeCreated: false,
  largeExpense: false,
  weeklySummary: false,
  monthlySummary: false,
  eveningReminder: false,
  goals: false,
};

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

describe('planNotifications: summaries', () => {
  const summaries = { ...RULES, subscriptionSoon: false, weeklySummary: true, monthlySummary: true };
  const example = createDataset(TODAY);

  it('sums up the week on Sunday at 20, with the same numbers as Analisi', () => {
    const week = buildAnalysis({ ...example, today: '2026-10-25' }, 'week', 0);
    const change = Math.round(Math.abs(week.comparison!.change) * 100);
    const direction = week.comparison!.change < 0 ? 'in meno' : 'in più';

    const notice = planNotifications(example, summaries, { privacy: false, now: MORNING }).find((n) => n.id.startsWith('week:'));

    expect(notice).toEqual({
      id: 'week:2026-10-19',
      at: new Date(2026, 9, 25, 20, 0),
      title: 'La tua settimana',
      body: `Hai speso ${formatMoney(week.totalMinor, 'EUR')}, il ${change}% ${direction} del solito.`,
    });
  });

  it('moves the week summary to the next Sunday once tonight’s has gone', () => {
    const sundayNight = new Date(2026, 9, 25, 20, 30);

    const notice = planNotifications(example, summaries, { privacy: false, now: sundayNight }).find((n) => n.id.startsWith('week:'));

    expect(notice).toMatchObject({ id: 'week:2026-10-26', at: new Date(2026, 10, 1, 20, 0) });
  });

  it('sums up the month on the first of the next one at 9, against the budget', () => {
    const month = buildBudgetOverview({ ...example, today: '2026-10-31' }).global!;

    const notice = planNotifications(example, summaries, { privacy: false, now: MORNING }).find((n) => n.id.startsWith('month:'));

    expect(notice).toEqual({
      id: 'month:2026-10',
      at: new Date(2026, 10, 1, 9, 0),
      title: 'Ottobre in breve',
      body: `Speso ${formatMoney(month.spentMinor, 'EUR')} su ${formatMoney(month.amountMinor, 'EUR')}: budget rispettato.`,
    });
  });

  it('says how far over the budget the month went, or only what was spent without one', () => {
    const over = { ...example, budgets: example.budgets.map((b) => (b.scope === 'global' ? { ...b, amountMinor: 10000 } : b)) };
    const spent = buildBudgetOverview({ ...over, today: '2026-10-31' }).global!.spentMinor;
    const noBudget = { ...example, budgets: example.budgets.filter((b) => b.scope !== 'global') };

    const [overNotice] = planNotifications(over, summaries, { privacy: false, now: MORNING }).filter((n) => n.id.startsWith('month:'));
    const [plainNotice] = planNotifications(noBudget, summaries, { privacy: false, now: MORNING }).filter((n) => n.id.startsWith('month:'));

    expect(overNotice.body).toBe(`Speso ${formatMoney(spent, 'EUR')} su ${formatMoney(10000, 'EUR')}: budget superato di ${formatMoney(spent - 10000, 'EUR')}.`);
    expect(plainNotice.body).toBe(`Speso ${formatMoney(spent, 'EUR')} ad ottobre.`);
  });

  it('keeps the summaries without figures with privacy on', () => {
    const bodies = planNotifications(example, summaries, { privacy: true, now: MORNING }).map((n) => n.body);

    expect(bodies).toEqual(['Il riepilogo della settimana è pronto.', 'Il riepilogo del mese è pronto.']);
  });
});

