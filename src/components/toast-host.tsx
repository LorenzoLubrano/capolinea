import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToast } from '@/state/toast';
import { layout, radius, shadows, spacing, useTheme } from '@/theme';

import { Glass } from './glass';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

const VISIBLE_MS = 5000;

/** Toast with an optional action (Annulla), above the tab bar, gone after 5 seconds. */
export function ToastHost() {
  const { current, hide } = useToast();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(() => hide(current.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [current, hide]);

  if (!current) return null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: insets.bottom + layout.tabBarHeight + spacing.smd,
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
      }}
    >
      <Animated.View
        key={current.id}
        entering={reduced ? FadeIn.duration(150) : FadeInDown.duration(250)}
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
