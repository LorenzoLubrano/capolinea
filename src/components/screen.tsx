import type { ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing, useTheme } from '@/theme';

/**
 * A tab screen: themed background, safe-area top, room for the tab bar at the bottom.
 * On iPad and web the content stays in a phone-wide column.
 */
export function Screen({ children, ...props }: { children: ReactNode } & ScrollViewProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        {...props}
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
      </ScrollView>
    </View>
  );
}
