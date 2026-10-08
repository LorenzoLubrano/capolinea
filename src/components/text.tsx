import { Text as RNText, type TextProps } from 'react-native';

import { speakable } from '@/services/format/money';

import { type, useTheme, type TypeVariant } from '@/theme';

export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'onInk' | 'alert' | 'warning';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  tone?: TextTone;
}

/** Every text in the app goes through here: a named style from the type ramp and a tone from the theme. */
export function AppText({ variant = 'body', tone = 'primary', style, accessibilityLabel, ...props }: AppTextProps) {
  const { colors } = useTheme();
  const color = {
    primary: colors.ink,
    secondary: colors.inkSecondary,
    tertiary: colors.inkTertiary,
    onInk: colors.onInk,
    alert: colors.alert,
    warning: colors.warning,
  }[tone];
  // A hidden amount in the text is read as «importo nascosto», not as four bullets.
  const text = typeof props.children === 'string' ? props.children : Array.isArray(props.children) && props.children.every((c) => typeof c === 'string' || typeof c === 'number') ? props.children.join('') : null;
  const label = accessibilityLabel !== undefined ? speakable(accessibilityLabel) : text !== null && speakable(text) !== text ? speakable(text) : undefined;
  return <RNText style={[type[variant], { color }, style]} accessibilityLabel={label} {...props} />;
}
