import { createEmptyDataset } from '@/data/defaults';
import type { Snapshot } from '@/data/repositories';
import { tx } from '@/domain/testing/builders';
import type { Budget, Goal } from '@/domain/types';
import { formatMoney } from '@/services/format/money';
import { DEFAULT_NOTIFICATIONS, type NotificationRules } from '@/state/settings';

import { currentNotices, noticesToSend, type Notice } from './events';

const TODAY = '2026-10-24';
const NOW = new Date(2026, 9, 24, 10, 0);
const RECENT = new Date(2026, 9, 23, 18, 0).toISOString();
const ALL_ON: NotificationRules = { ...DEFAULT_NOTIFICATIONS, chargeCreated: true, largeExpense: true, largeExpenseMinor: 10000 };
const META = { createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-01T08:00:00Z' };

const food: Budget = { id: 'budget-food', ...META, scope: 'category', categoryId: 'cat-groceries', amountMinor: 10000, currency: 'EUR', fromMonth: '2026-10' };
const groceries = (amountMinor: number) => tx({ categoryId: 'cat-groceries', amountMinor, date: '2026-10-20' });

function data(changes: Partial<Snapshot>): Snapshot {
  return { ...createEmptyDataset(TODAY), ...changes };
}

const notices = (snapshot: Snapshot, privacy = false) => currentNotices(snapshot, ALL_ON, { privacy, now: NOW });
const money = (minor: number) => formatMoney(minor, 'EUR');

describe('currentNotices: budgets', () => {
  it('says a budget is nearly gone once it reaches the threshold', () => {
    expect(notices(data({ budgets: [food], transactions: [groceries(8500)] }))).toEqual([
      { key: 'budgetNear:budget-food:2026-10', rule: 'budgetNear', title: 'Budget quasi finito', body: `Spesa alimentare: 85% del budget, restano ${money(1500)} per 8 giorni.` },
    ]);
  });

  it('says only that it is over once past the terminus', () => {
    expect(notices(data({ budgets: [food], transactions: [groceries(12000)] }))).toEqual([
      { key: 'budgetOver:budget-food:2026-10', rule: 'budgetOver', title: 'Budget superato', body: `Spesa alimentare: budget superato di ${money(2000)}.` },
    ]);
  });

  it('says nothing below the threshold', () => {
    expect(notices(data({ budgets: [food], transactions: [groceries(7000)] }))).toEqual([]);
  });
});

describe('currentNotices: movements', () => {
  it('announces a subscription charge created in the last week', () => {
    const charge = tx({ subscriptionId: 'sub-spotify', merchant: 'Spotify', amountMinor: 1099, createdAt: RECENT });
    const old = tx({ subscriptionId: 'sub-spotify', merchant: 'Spotify', amountMinor: 1099, createdAt: '2026-10-10T08:00:00Z' });

    expect(notices(data({ transactions: [charge, old] }))).toEqual([
      { key: `charge:${charge.id}`, rule: 'chargeCreated', title: 'Addebito registrato', body: `Spotify, ${money(1099)}, aggiunto ai movimenti.` },
    ]);
  });

  it('points out an expense entered above the threshold, but not a subscription charge', () => {
    const tv = tx({ merchant: 'MediaWorld', amountMinor: 49900, createdAt: RECENT });
    const insurance = tx({ subscriptionId: 'sub-insurance', merchant: 'Assicurazione', amountMinor: 45600, createdAt: RECENT });

    expect(notices(data({ transactions: [tv, insurance] })).map((n) => n.key)).toEqual([`large:${tv.id}`, `charge:${insurance.id}`]);
    expect(notices(data({ transactions: [tv] }))[0].body).toBe(`MediaWorld, ${money(49900)}: più della soglia che hai scelto.`);
  });
});

describe('currentNotices: goals', () => {
  const bike: Goal = {
    id: 'goal-bike', ...META, name: 'Bici', icon: 'Bicycle', color: 'green', targetMinor: 10000, currency: 'EUR',
    contributions: [{ id: 'c1', date: '2026-10-01', amountMinor: 6000 }],
  };

  it('has one notice per milestone passed', () => {
    const goals = notices(data({ goals: [bike] }));

    expect(goals.map((n) => n.key)).toEqual(['goal:goal-bike:25', 'goal:goal-bike:50']);
    expect(goals[1]).toMatchObject({ title: 'Bici a metà strada', body: `Hai messo da parte ${money(6000)} su ${money(10000)}.` });
  });
});

describe('currentNotices: privacy', () => {
  it('keeps every figure out', () => {
    const snapshot = data({
      budgets: [food],
      transactions: [groceries(8500), tx({ subscriptionId: 'sub-spotify', merchant: 'Spotify', amountMinor: 1099, createdAt: RECENT }), tx({ merchant: 'MediaWorld', amountMinor: 49900, createdAt: RECENT })],
    });

    for (const notice of notices(snapshot, true)) expect(`${notice.title} ${notice.body}`).not.toMatch(/\d/);
  });
});

describe('noticesToSend', () => {
  const notice = (key: string, rule: Notice['rule'], group?: string): Notice => ({ key, rule, title: key, body: key, ...(group ? { group } : {}) });
  const near = notice('budgetNear:b:2026-10', 'budgetNear');
  const charge = notice('charge:t1', 'chargeCreated');

  it('sends nothing the first time: what is already true is not news', () => {
    expect(noticesToSend([near, charge], null, ALL_ON)).toEqual({ send: [], seen: [near.key, charge.key] });
  });

  it('sends what is new, for the rules that are on, and remembers the rest too', () => {
    const result = noticesToSend([near, charge], [], { ...ALL_ON, chargeCreated: false });

    expect(result).toEqual({ send: [near], seen: [near.key, charge.key] });
  });

  it('sends only the highest new milestone of a goal', () => {
    const quarter = notice('goal:g:25', 'goals', 'g');
    const half = notice('goal:g:50', 'goals', 'g');

    expect(noticesToSend([quarter, half], [], ALL_ON).send).toEqual([half]);
  });

  it('forgets what is no longer true, so it can be news again', () => {
    expect(noticesToSend([charge], [near.key, charge.key], ALL_ON)).toEqual({ send: [], seen: [charge.key] });
  });
});
