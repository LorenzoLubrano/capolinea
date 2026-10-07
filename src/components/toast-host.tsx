import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/state/toast';
import { layout, radius, shadows, spacing, useTheme } from '@/theme';

import { Glass } from './glass';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

const VISIBLE_MS = 5000;
let hostSeq = 0;

/**
 * Toast with an optional action (Annulla), gone after 5 seconds. The root host sits above the tab
 * bar; a sheet mounts its own host, with `top` or `bottom` clearing its own controls.
 */
export function ToastHost({ top, bottom }: { top?: number; bottom?: number }) {
  const { current, hide, hosts, registerHost, unregisterHost } = useToast();
  const [hostId] = useState(() => ++hostSeq);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  // A toast stays on the screen that showed it (the store hands it down when that screen closes).
  const onTop = current?.hostId === undefined ? hosts[hosts.length - 1] === hostId : current.hostId === hostId;

  useEffect(() => {
    registerHost(hostId);
    return () => unregisterHost(hostId);
  }, [hostId, registerHost, unregisterHost]);

  useEffect(() => {
    if (!current || !onTop) return;
    const timer = setTimeout(() => hide(current.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current, hide, onTop]);

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
        entering={reduced || top !== undefined ? FadeIn.duration(150) : FadeInDown.duration(250)}
        exiting={FadeOut.duration(150)}
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
