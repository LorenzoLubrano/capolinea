import { createEmptyDataset } from '@/data/defaults';
import type { Snapshot } from '@/data/repositories';
import { subscription, tx } from '@/domain/testing/builders';
import type { Budget } from '@/domain/types';
import { DEFAULT_NOTIFICATIONS } from '@/state/settings';

import type { Notice } from './events';
import type { PlannedNotification } from './plan';
import { syncNotifications, type NoticeLog, type NotificationDevice } from './sync';

const NOW = new Date(2026, 9, 24, 10, 0);
const META = { createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-01T08:00:00Z' };
const food: Budget = { id: 'budget-food', ...META, scope: 'category', categoryId: 'cat-groceries', amountMinor: 10000, currency: 'EUR', fromMonth: '2026-10' };

function phone(allowed = true) {
  const scheduled: PlannedNotification[][] = [];
  const presented: Notice[] = [];
  let seen: string[] | null = null;
  const device: NotificationDevice = {
    allowed: async () => allowed,
    replaceScheduled: async (planned) => {
      scheduled.push(planned);
    },
    present: async (notices) => {
      presented.push(...notices);
    },
  };
  const log: NoticeLog = { read: () => seen, write: (keys) => (seen = keys) };
  return { device, log, scheduled, presented, seen: () => seen };
}

const withSpending = (amountMinor: number): Snapshot => ({
  ...createEmptyDataset('2026-10-24'),
  budgets: [food],
  transactions: [tx({ categoryId: 'cat-groceries', amountMinor, date: '2026-10-20' })],
});
const sync = (snapshot: Snapshot, p: ReturnType<typeof phone>, privacy = false) =>
  syncNotifications(snapshot, DEFAULT_NOTIFICATIONS, { privacy, now: NOW }, p.device, p.log);

describe('syncNotifications', () => {
  it('only takes note the first time, then sends what becomes true', async () => {
    const p = phone();
    await sync(withSpending(5000), p);
    await sync(withSpending(8500), p);

    expect(p.presented.map((n) => n.key)).toEqual(['budgetNear:budget-food:2026-10']);
  });

  it('does not send a notice twice', async () => {
    const p = phone();
    await sync(withSpending(5000), p);
    await sync(withSpending(8500), p);
    await sync(withSpending(8600), p);

    expect(p.presented).toHaveLength(1);
  });

  it('replaces the scheduled notifications with the new plan each time', async () => {
    const p = phone();
    const snapshot = { ...withSpending(5000), subscriptions: [subscription({ id: 'sub-netflix', nextBillingDate: '2026-10-31' })] };
    await sync(snapshot, p);

    expect(p.scheduled).toHaveLength(1);
    expect(p.scheduled[0].map((n) => n.id)).toEqual(['subscription:sub-netflix:2026-10-31', 'month:2026-10']);
  });

  it('without permission schedules and sends nothing, but still takes note', async () => {
    const p = phone(false);
    await sync(withSpending(5000), p);
    await sync(withSpending(8500), p);

    expect(p.scheduled).toEqual([]);
    expect(p.presented).toEqual([]);
    expect(p.seen()).toEqual(['budgetNear:budget-food:2026-10']);
  });

  it('keeps to the sixty earliest notifications, as phones keep a limited number', async () => {
    const p = phone();
    const many = Array.from({ length: 80 }, (_, i) =>
      subscription({ id: `sub-${String(i).padStart(2, '0')}`, nextBillingDate: `2026-${i < 40 ? '11' : '12'}-${String((i % 28) + 1).padStart(2, '0')}` }),
    );
    await sync({ ...withSpending(0), subscriptions: many }, p);

    expect(p.scheduled[0]).toHaveLength(60);
    const times = p.scheduled[0].map((n) => n.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
