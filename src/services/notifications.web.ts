import type { NotificationDevice } from '@/features/notifications/sync';

/** The web preview (development only) sends no notification: the phone uses `notifications.ts`. */
export async function notificationsAllowed(): Promise<boolean> {
  return false;
}

export async function askForNotifications(): Promise<boolean> {
  return false;
}

export async function allowNotifications(): Promise<boolean> {
  return false;
}

export const notificationDevice: NotificationDevice = {
  allowed: async () => false,
  replaceScheduled: async () => undefined,
  present: async () => undefined,
};
