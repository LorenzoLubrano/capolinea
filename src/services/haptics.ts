import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * One haptic per user action, fired in the same frame as the visual, never the only feedback.
 * Silent on web.
 */
const enabled = Platform.OS === 'ios' || Platform.OS === 'android';
const ignore = () => {};

export const haptics = {
  /** A value ticks past a step: category chip, keypad-free pickers. */
  selection: () => enabled && Haptics.selectionAsync().catch(ignore),
  /** Something commits lightly: + pressed, privacy toggled. */
  light: () => enabled && Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(ignore),
  success: () => enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(ignore),
  warning: () => enabled && Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(ignore),
};
