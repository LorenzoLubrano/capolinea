import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

/**
 * Speaks a message with VoiceOver. Android needs nothing: TalkBack reads the live regions
 * (`accessibilityLiveRegion`) the same messages sit in, which iOS ignores.
 */
export function announce(message: string) {
  if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
}

/** Announces the message every time it changes to a new text; with `skipInitial`, not on mount. */
export function useAnnounce(message: string | null | undefined, { skipInitial = false }: { skipInitial?: boolean } = {}) {
  const skip = useRef(skipInitial);
  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    if (message) announce(message);
  }, [message]);
}

/** From this text size, rows of side-by-side figures stack instead of squeezing. */
const LARGE_TEXT = 1.35;

/** Whether the user reads with large text (Dynamic Type, Android font size): layouts reflow. */
export function useLargeText(): boolean {
  return useWindowDimensions().fontScale >= LARGE_TEXT;
}

/** Whether VoiceOver or TalkBack is on, kept current while the app runs. */
export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled().then((value) => {
      if (alive) setOn(value);
    });
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return on;
}

/** Reduce Motion as the system says now; `null` until the first answer arrives. */
let liveReduceMotion: boolean | null = null;
const reduceMotionListeners = new Set<() => void>();
let reduceMotionWatched = false;

function watchReduceMotion(listener: () => void) {
  reduceMotionListeners.add(listener);
  // One subscription for the whole app: pressable elements alone mount by the hundred.
  if (!reduceMotionWatched) {
    reduceMotionWatched = true;
    const update = (value: boolean) => {
      if (value === liveReduceMotion) return;
      liveReduceMotion = value;
      reduceMotionListeners.forEach((notify) => notify());
    };
    AccessibilityInfo.isReduceMotionEnabled().then(update);
    AccessibilityInfo.addEventListener('reduceMotionChanged', update);
  }
  return () => {
    reduceMotionListeners.delete(listener);
  };
}

/**
 * Whether Reduce Motion is on, kept current while the app runs. Reanimated's own hook keeps the
 * value the app started with; it still answers the first frame, before the system replies.
 */
export function useReduceMotion(): boolean {
  const atLaunch = useReducedMotion();
  return useSyncExternalStore(watchReduceMotion, () => liveReduceMotion ?? atLaunch);
}
