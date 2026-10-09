import { useEffect } from 'react';
import { create } from 'zustand';

import { useSnapshot } from '@/data/queries';
import { noticeLog } from '@/services/notice-log';
import { notificationDevice } from '@/services/notifications';
import { useSettings } from '@/state/settings';

import { syncNotifications } from './sync';

// One sync at a time, in order: a quick series of changes never mixes two plans.
let queue: Promise<void> = Promise.resolve();

/** Bumped when notifications become allowed: the plan is scheduled at once, not at the next change. */
export const usePermissionChange = create<{ count: number; changed: () => void }>((set) => ({
  count: 0,
  changed: () => set((state) => ({ count: state.count + 1 })),
}));

/** Keeps the phone's notifications in line with the data, the rules and the privacy. Renders nothing. */
export function NotificationsPlanner() {
  const { data } = useSnapshot();
  const rules = useSettings((s) => s.notifications);
  const privacy = useSettings((s) => s.privacy);
  const onboarded = useSettings((s) => s.onboarded);
  const permission = usePermissionChange((s) => s.count);

  useEffect(() => {
    if (!data || !onboarded) return;
    queue = queue
      .then(() => syncNotifications(data, rules, { privacy, now: new Date() }, notificationDevice, noticeLog))
      .catch((error: unknown) => {
        if (__DEV__) console.warn('Notifications not synced', error);
      });
  }, [data, rules, privacy, onboarded, permission]);

  return null;
}
