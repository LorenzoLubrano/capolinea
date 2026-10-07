import type { StyleProp, ViewStyle } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

const variants = {
  /** Ink: the one main action of a screen. */
  primary: { background: 'ink', text: 'onInk', height: 56 },
  /** Quiet action, side by side with others. */
  secondary: { background: 'surfaceMuted', text: 'primary', height: 52 },
  /** Removes something; the undo toast replaces a confirmation. */
  destructive: { background: 'surfaceMuted', text: 'alert', height: 52 },
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  busy,
  stacked,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: keyof typeof variants;
  icon?: IconName;
  disabled?: boolean;
  busy?: boolean;
  /** Icon above the label, for a row of equal actions on a narrow screen. */
  stacked?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const v = variants[variant];
  const textColor = { onInk: colors.onInk, primary: colors.ink, alert: colors.alert }[v.text];
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled, busy: !!busy }}
      disabled={disabled}
      onPress={onPress}
      style={[
        {
          flexDirection: stacked ? 'column' : 'row',
          gap: stacked ? spacing.xs : spacing.sm,
          minHeight: stacked ? 64 : v.height,
          paddingHorizontal: stacked ? spacing.sm : spacing.md,
          borderRadius: radius.control,
          borderCurve: 'continuous',
          backgroundColor: colors[v.background],
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={stacked ? 22 : 18} color={textColor} weight={variant === 'primary' ? 'bold' : 'regular'} /> : null}
      <AppText variant={stacked ? 'subheadStrong' : 'bodyStrong'} tone={v.text} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}
