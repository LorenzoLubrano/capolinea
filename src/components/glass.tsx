import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { AccessibilityInfo, Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import { useEffect, useState } from 'react';

import { useTheme } from '@/theme';

function useReduceTransparency() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    // The setting exists only on iOS; elsewhere glass falls back on its own.
    if (Platform.OS !== 'ios') return;
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

/**
 * Glass only where things float (tab bar, sheets, toasts).
 * iOS 26: Liquid Glass. Older iOS and web: system blur. Android: translucent surface without blur,
 * because Android blur needs a BlurTargetView around the content behind it.
 * "Reduce Transparency" always gets a solid surface.
 */
export function Glass({ children, style }: { children?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, scheme } = useTheme();
  const reduce = useReduceTransparency();

  if (reduce) return <View style={[style, { backgroundColor: colors.surface }]}>{children}</View>;

  if (Platform.OS === 'ios' && isLiquidGlassAvailable()) {
    return (
      <GlassView style={style} glassEffectStyle="regular" colorScheme={scheme}>
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'ios' || Platform.OS === 'web') {
    return (
      <BlurView
        style={[style, { backgroundColor: colors.glass }]}
        intensity={60}
        tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      >
        {children}
      </BlurView>
    );
  }

  return <View style={[style, { backgroundColor: colors.surface }]}>{children}</View>;
}
