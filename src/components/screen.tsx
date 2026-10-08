import type { ReactNode } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backdrop as backdropTokens, layout, spacing, useTheme } from '@/theme';

/**
 * A tab screen: themed background, safe-area top, room for the tab bar at the bottom.
 * On iPad and web the content stays in a phone-wide column. `variant="stack"` is for pushed screens:
 * the native header already clears the status bar and there is no tab bar.
 * An optional `backdrop` sits behind the content: it scrolls slower than the content (with it, under
 * Reduce Motion) and fades out as the content passes over it, so text never sits on the drawing.
 */
export function Screen({
  children,
  backdrop,
  variant = 'tab',
  ...props
}: { children: ReactNode; backdrop?: ReactNode; variant?: 'tab' | 'stack' } & ScrollViewProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const factor = reduced ? 1 : backdropTokens.parallax;
  const statusBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, spacing.md], [0, 1], Extrapolation.CLAMP),
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [0, backdropTokens.fadeOut], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: -scrollY.get() * factor }],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {backdrop ? (
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }, backdropStyle]}
        >
          {backdrop}
        </Animated.View>
      ) : null}
      <Animated.ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        {...props}
        onScroll={backdrop || variant === 'tab' ? onScroll : undefined}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingTop: variant === 'tab' ? insets.top + spacing.sm : spacing.md,
          paddingBottom: insets.bottom + (variant === 'tab' ? layout.tabBarHeight : 0) + spacing.xl,
          paddingHorizontal: spacing.gutter,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}
      >
        {children}
      </Animated.ScrollView>
      {variant === 'tab' ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.background }, statusBarStyle]}
        />
      ) : null}
    </View>
  );
}
