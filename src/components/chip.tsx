import type { ReactNode } from 'react';

import { radius, spacing, useTheme } from '@/theme';

import { PressableScale } from './pressable-scale';
import { AppText } from './text';

/** A pill choice: filters, categories, accounts. Selected chips turn ink. */
export function Chip({
  label,
  selected,
  onPress,
  leading,
  trailing,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        minHeight: 44,
        paddingLeft: leading ? spacing.xs + 2 : spacing.smd,
        paddingRight: trailing ? spacing.sm : spacing.smd,
        borderRadius: radius.full,
        backgroundColor: selected ? colors.ink : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.ink : colors.hairline,
      }}
    >
      {leading}
      <AppText variant="subheadStrong" tone={selected ? 'onInk' : 'primary'} numberOfLines={1}>
        {label}
      </AppText>
      {trailing}
    </PressableScale>
  );
}
