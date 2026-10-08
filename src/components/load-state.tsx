import { View } from 'react-native';

import { it } from '@/i18n/it';
import { radius, spacing, useTheme } from '@/theme';

import { Button } from './button';
import { AppText } from './text';

/** Grey blocks in the shape of what is loading, so the screen does not jump when data arrives. */
export function LoadingBlocks({ heights }: { heights: number[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md }} accessible accessibilityLabel={it.common.loading}>
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
      <Button label={it.home.error.retry} icon="ArrowsClockwise" variant="secondary" onPress={onRetry} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}
