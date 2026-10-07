import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { radius, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

/** A titled group of rows on one surface, separated by hairlines: a grouped list, not a stack of cards. */
export function SettingsGroup({ title, children, footer }: { title?: string; children: ReactNode; footer?: string }) {
  const { colors } = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={{ gap: spacing.sm }}>
      {title ? (
        <AppText variant="subheadStrong" tone="secondary" accessibilityRole="header" style={{ paddingHorizontal: spacing.xs }}>
          {title}
        </AppText>
      ) : null}
      <View style={{ borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: colors.surface, overflow: 'hidden' }}>
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <View style={{ height: 1, marginLeft: spacing.md, backgroundColor: colors.hairline }} /> : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        <AppText variant="footnote" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

/** One row: icon, title, optional hint, then a chevron (navigation) or a check (choice). */
export function SettingsRow({
  title,
  hint,
  icon,
  onPress,
  checked,
  role = 'button',
}: {
  title: string;
  hint?: string;
  icon?: IconName;
  onPress: () => void;
  checked?: boolean;
  role?: 'button' | 'radio';
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: !!checked } : undefined}
      accessibilityHint={hint}
      feedback="dim"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
    >
      {icon ? <Icon name={icon} size={22} color={colors.ink} /> : null}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <AppText variant="body">{title}</AppText>
        {hint ? (
          <AppText variant="footnote" tone="secondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      {role === 'radio' ? (
        checked ? <Icon name="Check" size={20} color={colors.ink} weight="bold" /> : null
      ) : (
        <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
      )}
    </PressableScale>
  );
}
