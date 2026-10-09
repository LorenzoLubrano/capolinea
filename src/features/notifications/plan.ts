import type { Snapshot } from '@/data/repositories';
import { addDays, toLocalDate, weekdayMondayFirst } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';
import { it } from '@/i18n/it';
import { weekdayName } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import type { NotificationRules } from '@/state/settings';

export interface PlannedNotification {
  /** The same notice keeps the same id, so planning again replaces it instead of adding one. */
  id: string;
  at: Date;
  title: string;
  body: string;
}

const NOTICE_HOUR = 9;
const EVENING_HOUR = 21;
/** Evenings scheduled ahead: the reminders keep coming for a week even if the app is not opened. */
const EVENINGS = 7;

const atHour = (date: LocalDate, hour: number) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0);
};

/**
 * The local notifications to schedule from `now` on, earliest first. Planned again whenever the
 * data, the rules or the privacy change. With privacy on there is no figure: the notification can
 * show up on a locked screen.
 */
export function planNotifications(snapshot: Snapshot, rules: NotificationRules, { privacy, now }: { privacy: boolean; now: Date }): PlannedNotification[] {
  const today = toLocalDate(now);
  const planned: PlannedNotification[] = [];

  if (rules.subscriptionSoon) {
    const { title } = it.notificationRules.samples.subscriptionSoon;
    for (const subscription of snapshot.subscriptions) {
      const charge = subscription.nextBillingDate;
      if (!subscription.active || (subscription.endDate && charge > subscription.endDate)) continue;
      const when = rules.subscriptionDaysBefore === 1 ? it.notificationMessages.tomorrow : weekdayName(weekdayMondayFirst(charge));
      const body = privacy
        ? it.notificationMessages.subscriptionSoonMasked(subscription.name)
        : it.notificationMessages.subscriptionSoon(subscription.name, formatMoney(subscription.amountMinor, subscription.currency), when);
      planned.push({ id: `subscription:${subscription.id}:${charge}`, at: atHour(addDays(charge, -rules.subscriptionDaysBefore), NOTICE_HOUR), title, body });
    }
  }

  if (rules.eveningReminder) {
    const { title, masked } = it.notificationRules.samples.eveningReminder;
    // «Entered» today: whatever its date, a movement written today counts.
    const enteredToday = snapshot.transactions.some((tx) => toLocalDate(new Date(tx.createdAt)) === today);
    for (let i = enteredToday ? 1 : 0; i < EVENINGS; i += 1) {
      const date = addDays(today, i);
      planned.push({ id: `evening:${date}`, at: atHour(date, EVENING_HOUR), title, body: masked });
    }
  }

  return planned.filter((notice) => notice.at > now).sort((a, b) => a.at.getTime() - b.at.getTime());
}
