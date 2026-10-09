import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import type { NotificationDevice } from '@/features/notifications/sync';
import { it } from '@/i18n/it';

const CHANNEL = 'avvisi';

// Shown while the app is open too: a notice has no other place in the app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let channel: Promise<unknown> | null = null;

/** Android shows no permission prompt, and no notification, before a channel exists. */
function ensureChannel() {
  if (Platform.OS !== 'android') return Promise.resolve();
  channel ??= Notifications.setNotificationChannelAsync(CHANNEL, { name: it.notificationSettings.channel, importance: Notifications.AndroidImportance.DEFAULT });
  return channel;
}

export async function notificationsAllowed(): Promise<boolean> {
  return (await Notifications.getPermissionsAsync()).granted;
}

/** Asks the system once; true when notifications can be shown. */
export async function askForNotifications(): Promise<boolean> {
  await ensureChannel();
  if ((await Notifications.getPermissionsAsync()).granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/**
 * From Impostazioni › Notifiche: the system prompt while the system still asks, otherwise the
 * phone's settings for the app, where the user can allow them.
 */
export async function allowNotifications(): Promise<boolean> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    await Linking.openSettings();
    return false;
  }
  return (await Notifications.requestPermissionsAsync()).granted;
}

export const notificationDevice: NotificationDevice = {
  allowed: notificationsAllowed,
  async replaceScheduled(planned) {
    await ensureChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();
    for (const notice of planned) {
      await Notifications.scheduleNotificationAsync({
        identifier: notice.id,
        content: { title: notice.title, body: notice.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: notice.at, channelId: CHANNEL },
      });
    }
  },
  async present(notices) {
    await ensureChannel();
    for (const notice of notices) {
      await Notifications.scheduleNotificationAsync({ content: { title: notice.title, body: notice.body }, trigger: { channelId: CHANNEL } });
    }
  },
};
