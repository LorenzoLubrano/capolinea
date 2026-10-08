import { Children, type ReactNode } from 'react';
import { View } from 'react-native';

import { haptics } from '@/services/haptics';
import { radius, spacing, useTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { PressableScale } from './pressable-scale';
import { ThemedSwitch } from './themed-switch';
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
  value,
  destructive,
}: {
  title: string;
  hint?: string;
  icon?: IconName;
  onPress: () => void;
  checked?: boolean;
  role?: 'button' | 'radio';
  /** Current value, shown before the chevron: `Euro (EUR)`. */
  value?: string;
  /** Destructive rows (Elimina dati locali) read in the alert colour. */
  destructive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole={role}
      accessibilityState={role === 'radio' ? { checked: !!checked } : undefined}
      // The name (and value) as the label, the hint once as a hint: never read twice.
      accessibilityLabel={value ? `${title}, ${value}` : title}
      accessibilityHint={hint}
      feedback="dim"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
    >
      {icon ? <Icon name={icon} size={22} color={destructive ? colors.alert : colors.ink} /> : null}
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <AppText variant="body" tone={destructive ? 'alert' : 'primary'}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="footnote" tone="secondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="subhead" tone="secondary">
          {value}
        </AppText>
      ) : null}
      {role === 'radio' ? (
        checked ? <Icon name="Check" size={20} color={colors.ink} weight="bold" /> : null
      ) : (
        <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
      )}
    </PressableScale>
  );
}

/** A row with a switch: the whole row toggles it, so the target is never just the switch. */
export function SettingsSwitchRow({
  title,
  hint,
  icon,
  value,
  onValueChange,
  disabled,
  children,
}: {
  title: string;
  hint?: string;
  icon?: IconName;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Options that belong to the switch, shown under it while it is on. */
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const toggle = () => {
    if (disabled) return;
    haptics.selection();
    onValueChange(!value);
  };
  return (
    <View>
      <PressableScale
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled: !!disabled }}
        accessibilityLabel={title}
        accessibilityHint={hint}
        feedback="dim"
        disabled={disabled}
        onPress={toggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
      >
        {icon ? <Icon name={icon} size={22} color={disabled ? colors.inkTertiary : colors.ink} /> : null}
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <AppText variant="body" tone={disabled ? 'tertiary' : 'primary'}>
            {title}
          </AppText>
          {hint ? (
            <AppText variant="footnote" tone="secondary">
              {hint}
            </AppText>
          ) : null}
        </View>
        <ThemedSwitch
          value={value}
          onValueChange={toggle}
          disabled={disabled}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        />
      </PressableScale>
      {value && children ? <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm }}>{children}</View> : null}
    </View>
  );
}

/** A row that only informs: an icon, a label and, optionally, a value on the right. */
export function SettingsInfoRow({ title, value, icon }: { title: string; value?: string; icon?: IconName }) {
  const { colors } = useTheme();
  return (
    <View accessible style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
      {icon ? <Icon name={icon} size={20} color={colors.inkSecondary} /> : null}
      <AppText variant="body" style={{ flex: 1 }}>
        {title}
      </AppText>
      {value ? (
        <AppText variant="body" tone="secondary">
          {value}
        </AppText>
      ) : null}
    </View>
  );
}
