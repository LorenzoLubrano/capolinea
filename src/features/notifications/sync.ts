import type { Snapshot } from '@/data/repositories';
import type { NotificationRules } from '@/state/settings';

import { currentNotices, noticesToSend, type Notice } from './events';
import { planNotifications, type PlannedNotification } from './plan';

/** What the phone does with notifications (`services/notifications.ts`). */
export interface NotificationDevice {
  allowed(): Promise<boolean>;
  /** Cancels what the app scheduled before and schedules `planned`. */
  replaceScheduled(planned: PlannedNotification[]): Promise<void>;
  /** Shows `notices` now. */
  present(notices: Notice[]): Promise<void>;
  /** Removes the notifications already shown. */
  dismissShown(): Promise<void>;
}

/** The keys of the events true at the last check; null before the first one. */
export interface NoticeLog {
  read(): string[] | null;
  write(keys: string[]): void;
}

/** Phones keep a limited number of scheduled notifications (iOS: 64): the earliest go first. */
const MAX_SCHEDULED = 60;

/**
 * Brings the notifications in line with the data: notes the events true now and shows the new ones,
 * then replaces the scheduled notifications with the plan. Without permission it only takes note,
 * so allowing notifications later does not send old news.
 */
export async function syncNotifications(
  snapshot: Snapshot,
  rules: NotificationRules,
  { privacy, now }: { privacy: boolean; now: Date },
  device: NotificationDevice,
  log: NoticeLog,
): Promise<void> {
  const { send, seen } = noticesToSend(currentNotices(snapshot, rules, { privacy, now }), log.read(), rules);
  if (!(await device.allowed())) return log.write(seen);
  // Noted only once shown: a notice the phone failed to show goes out at the next check.
  if (send.length) await device.present(send);
  log.write(seen);
  await device.replaceScheduled(planNotifications(snapshot, rules, { privacy, now }).slice(0, MAX_SCHEDULED));
}
