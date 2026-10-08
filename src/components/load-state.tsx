import { View } from 'react-native';

import { it } from '@/i18n/it';
import { radius, spacing, useTheme } from '@/theme';

import { PressableScale } from './pressable-scale';
import { AppText } from './text';

/** Grey blocks in the shape of what is loading, so the screen does not jump when data arrives. */
export function LoadingBlocks({ heights }: { heights: number[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md }} accessibilityLabel={it.common.loading}>
      {heights.map((h, i) => (
        <View key={i} style={{ height: h, borderRadius: radius.sign, backgroundColor: colors.track }} />
      ))}
    </View>
  );
}

/** Data could not be read: say so and offer to try again. */
export function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="title3">{it.home.error.title}</AppText>
      <AppText tone="secondary">{it.home.error.body}</AppText>
      <PressableScale accessibilityRole="button" onPress={onRetry} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
        <AppText variant="bodyStrong">{it.home.error.retry}</AppText>
      </PressableScale>
    </View>
  );
}
