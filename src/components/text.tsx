import { Text as RNText, type TextProps } from 'react-native';

import { type, useTheme, type TypeVariant } from '@/theme';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'onInk' | 'alert' | 'warning';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: TextTone;
}

/** Every text in the app goes through here: a named style from the type ramp and a tone from the theme. */
export function AppText({ variant = 'body', tone = 'primary', style, ...props }: AppTextProps) {
  const { colors } = useTheme();
  const color = {
    primary: colors.ink,
    secondary: colors.inkSecondary,
    tertiary: colors.inkTertiary,
    onInk: colors.onInk,
    alert: colors.alert,
    warning: colors.warning,
  }[tone];
  return <RNText style={[type[variant], { color }, style]} {...props} />;
}
