import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useIsFocused } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { it } from '@/i18n/it';
import { announce, useReduceMotion, useScreenReader } from '@/services/a11y';
import { useToast } from '@/state/toast';
import { layout, motion, radius, shadows, spacing, useTheme } from '@/theme';

import { Glass } from './glass';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

const VISIBLE_MS = 5000;
/** With a screen reader on, a toast with Annulla waits long enough to be reached by swiping. */
const READER_MS = 15000;
let hostSeq = 0;

/** Above the tab bar the toast rises from below and sinks back; in a sheet, and with Reduce Motion, it only fades. */
const RISE_IN = FadeInDown.duration(motion.base).easing(motion.easeOutTiming);
const SINK_OUT = FadeOutDown.duration(200).easing(motion.easeOutTiming);
const FADE_IN = FadeIn.duration(motion.fast).easing(motion.easeOutTiming).reduceMotion(ReduceMotion.Never);
const FADE_OUT = FadeOut.duration(120).easing(motion.easeOutTiming).reduceMotion(ReduceMotion.Never);

/**
 * Toast with an optional action (Annulla), gone after 5 seconds (15 with a screen reader and an
 * action). VoiceOver hears it through `announce`, TalkBack through the live region. The root host sits above the tab
 * bar; a sheet mounts its own host, with `top` or `bottom` clearing its own controls.
 */
export function ToastHost({ top, bottom }: { top?: number; bottom?: number }) {
  return top !== undefined || bottom !== undefined ? <ScreenToastHost top={top} bottom={bottom} /> : <Host focused />;
}

/**
 * A sheet's host shows nothing once its screen loses focus: a save closes the sheet and toasts in
 * the same moment, and the toast belongs to the screen underneath, where it lands when the sheet is gone.
 */
function ScreenToastHost({ top, bottom }: { top?: number; bottom?: number }) {
  const focused = useIsFocused();
  return <Host top={top} bottom={bottom} focused={focused} />;
}

function Host({ top, bottom, focused }: { top?: number; bottom?: number; focused: boolean }) {
  const { current, hide, hosts, registerHost, unregisterHost } = useToast();
  const [hostId] = useState(() => ++hostSeq);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduced = useReduceMotion();
  const reader = useScreenReader();
  // A toast stays on the screen that showed it (the store hands it down when that screen closes).
  const onTop = focused && (current?.hostId === undefined ? hosts[hosts.length - 1] === hostId : current.hostId === hostId);

  useEffect(() => {
    registerHost(hostId);
    return () => unregisterHost(hostId);
  }, [hostId, registerHost, unregisterHost]);

  useEffect(() => {
    if (!current || !onTop) return;
    const timer = setTimeout(() => hide(current.id), reader && current.actionLabel ? READER_MS : VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current, hide, onTop, reader]);

  useEffect(() => {
    if (current && onTop) announce(current.actionLabel ? it.toast.withAction(current.text, current.actionLabel) : current.text);
  }, [current, onTop]);

  if (!current || !onTop) return null;
  const position =
    top !== undefined ? { top } : { bottom: insets.bottom + (bottom ?? layout.tabBarHeight + spacing.smd) };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        ...position,
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
      }}
    >
      <Animated.View
        key={current.id}
        entering={reduced || top !== undefined ? FADE_IN : RISE_IN}
        exiting={reduced || top !== undefined ? FADE_OUT : SINK_OUT}
        accessibilityLiveRegion="polite"
        style={{ width: '100%', maxWidth: layout.maxContentWidth - spacing.gutter * 2, boxShadow: shadows.floating, borderRadius: radius.control }}
      >
        <Glass
          style={{
            borderRadius: radius.control,
            borderCurve: 'continuous',
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: colors.glassBorder,
            paddingLeft: spacing.md,
            paddingRight: spacing.xs,
            minHeight: 52,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <AppText variant="callout" style={{ flexShrink: 1 }}>
            {current.text}
          </AppText>
          {current.actionLabel ? (
            <PressableScale
              accessibilityRole="button"
              onPress={() => {
                current.onAction?.();
                hide(current.id);
              }}
              style={{ paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center' }}
            >
              <AppText variant="subheadStrong">{current.actionLabel}</AppText>
            </PressableScale>
          ) : null}
        </Glass>
      </Animated.View>
    </View>
  );
}
