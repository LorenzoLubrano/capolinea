import { useEffect, useRef } from 'react';
import { create } from 'zustand';

import { useSnapshot } from '@/data/queries';
import { noticeLog } from '@/services/notice-log';
import { notificationDevice } from '@/services/notifications';
import { useSettings } from '@/state/settings';

import { syncNotifications } from './sync';

// One sync at a time, in order: a quick series of changes never mixes two plans.
let queue: Promise<void> = Promise.resolve();
function enqueue(task: () => Promise<void>) {
  queue = queue.then(task).catch((error: unknown) => {
    if (__DEV__) console.warn('Notifications not synced', error);
  });
}

/** Bumped when notifications become allowed: the plan is scheduled at once, not at the next change. */
export const usePermissionChange = create<{ count: number; changed: () => void }>((set) => ({
  count: 0,
  changed: () => set((state) => ({ count: state.count + 1 })),
}));

/** Keeps the phone's notifications in line with the data, the rules and the privacy. Renders nothing. */
export function NotificationsPlanner() {
  const { data } = useSnapshot();
  const rules = useSettings((s) => s.notifications);
  // Figures only when chosen in Impostazioni › Notifiche; the eye in Home does not change them.
  const privacy = !rules.showAmounts;
  const onboarded = useSettings((s) => s.onboarded);
  const permission = usePermissionChange((s) => s.count);

  useEffect(() => {
    // After «Elimina dati» nothing planned from the old data may still go off, nor stay on screen.
    if (!onboarded) return enqueue(async () => {
      await notificationDevice.replaceScheduled([]);
      await notificationDevice.dismissShown();
    });
    if (!data) return;
    enqueue(() => syncNotifications(data, rules, { privacy, now: new Date() }, notificationDevice, noticeLog));
  }, [data, rules, privacy, onboarded, permission]);

  // Figures turned off: notifications already shown may carry amounts.
  const wasPrivate = useRef(privacy);
  useEffect(() => {
    if (privacy && !wasPrivate.current) enqueue(() => notificationDevice.dismissShown());
    wasPrivate.current = privacy;
  }, [privacy]);

  return null;
}
