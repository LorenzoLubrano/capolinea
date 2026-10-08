import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { it } from '@/i18n/it';

/**
 * Keeps a sheet with something written from closing by mistake: on iOS the swipe pulls back
 * instead of dismissing, and Back, Annulla or a swipe that gets through ask first. Values equal to
 * the ones the sheet opened with (or to `baseline`, when given) count as nothing written. Returns
 * `allowLeave`, to call before closing on purpose (after saving or deleting).
 */
export function useDiscardGuard(values: Record<string, unknown>, baseline?: Record<string, unknown>): () => void {
  const navigation = useNavigation();
  const [initial] = useState(() => JSON.stringify(baseline ?? values));
  const leaving = useRef(false);
  // The web preview has no native alert to ask with.
  const guard = Platform.OS !== 'web' && JSON.stringify(values) !== initial;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !guard });
  }, [guard, navigation]);

  usePreventRemove(guard, ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert(it.discard.title, it.discard.body, [
      { text: it.discard.keep, style: 'cancel' },
      { text: it.discard.discard, style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  return () => {
    leaving.current = true;
  };
}
