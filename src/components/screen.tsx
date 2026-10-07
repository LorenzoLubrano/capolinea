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
 * On iPad and web the content stays in a phone-wide column.
 * An optional `backdrop` sits behind the content: it scrolls slower than the content (with it, under
 * Reduce Motion) and fades out as the content passes over it, so text never sits on the drawing.
 */
export function Screen({ children, backdrop, ...props }: { children: ReactNode; backdrop?: ReactNode } & ScrollViewProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const factor = reduced ? 1 : backdropTokens.parallax;
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
        {...props}
        onScroll={backdrop ? onScroll : undefined}
        scrollEventThrottle={16}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + layout.tabBarHeight + spacing.xl,
          paddingHorizontal: spacing.gutter,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}
      >
        {children}
      </Animated.ScrollView>
    </View>
  );
}
