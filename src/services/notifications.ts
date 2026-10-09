// Local notifications only, module by module: the package root also sets up remote push, which on
// Android throws at import inside Expo Go («removed from Expo Go with the release of SDK 53»).
import { cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import { deleteNotificationChannelAsync } from 'expo-notifications/build/deleteNotificationChannelAsync';
import { dismissAllNotificationsAsync } from 'expo-notifications/build/dismissAllNotificationsAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { isRunningInExpoGo } from 'expo';
import { Linking, Platform } from 'react-native';

import type { NotificationDevice } from '@/features/notifications/sync';
import { it } from '@/i18n/it';

// The channel of the installed app. An earlier build made «avvisi»: it is deleted, and this id stays.
// What shows on the lock screen is the phone's choice, not the app's: Android ignores a channel's
// lock screen visibility set by the app. The notifications are private, so a phone set to hide
// sensitive content shows only that Capolinea wrote.
const CHANNEL = 'avvisi-privati';
const OLD_CHANNELS = ['avvisi'];
// Expo Go cannot create channels (a native NullPointerException) and has its own: there the app
// uses those. The installed app (APK) has its «Avvisi» channel.
const OWN_CHANNEL = Platform.OS === 'android' && !isRunningInExpoGo();
const channelId = OWN_CHANNEL ? { channelId: CHANNEL } : {};

// Shown while the app is open too: a notice has no other place in the app.
setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

let channel: Promise<unknown> | null = null;

/** Android shows no permission prompt, and no notification, before a channel exists. */
function ensureChannel() {
  if (!OWN_CHANNEL) return Promise.resolve();
  channel ??= Promise.all(OLD_CHANNELS.map((id) => deleteNotificationChannelAsync(id))).then(() =>
    setNotificationChannelAsync(CHANNEL, { name: it.notificationSettings.channel, importance: AndroidImportance.DEFAULT }),
  );
  return channel;
}

export async function notificationsAllowed(): Promise<boolean> {
  return (await getPermissionsAsync()).granted;
}

/** Asks the system once; true when notifications can be shown. */
export async function askForNotifications(): Promise<boolean> {
  await ensureChannel();
  if ((await getPermissionsAsync()).granted) return true;
  return (await requestPermissionsAsync()).granted;
}

/**
 * From Impostazioni › Notifiche: the system prompt while the system still asks, otherwise the
 * phone's settings for the app, where the user can allow them.
 */
export async function allowNotifications(): Promise<boolean> {
  await ensureChannel();
  const current = await getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) {
    await Linking.openSettings();
    return false;
  }
  return (await requestPermissionsAsync()).granted;
}

export const notificationDevice: NotificationDevice = {
  allowed: notificationsAllowed,
  async replaceScheduled(planned) {
    await ensureChannel();
    await cancelAllScheduledNotificationsAsync();
    for (const notice of planned) {
      await scheduleNotificationAsync({
        identifier: notice.id,
        content: { title: notice.title, body: notice.body },
        trigger: { type: SchedulableTriggerInputTypes.DATE, date: notice.at, ...channelId },
      });
    }
  },
  async dismissShown() {
    await dismissAllNotificationsAsync();
  },
  async present(notices) {
    await ensureChannel();
    for (const notice of notices) {
      await scheduleNotificationAsync({ content: { title: notice.title, body: notice.body }, trigger: OWN_CHANNEL ? { channelId: CHANNEL } : null });
    }
  },
};
