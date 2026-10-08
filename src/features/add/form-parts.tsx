import type { ReactNode } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import type { KeypadKey } from '@/domain/money';
import { it } from '@/i18n/it';
import { radius, spacing, type, useTheme } from '@/theme';

import { Keypad } from './keypad';

/** `1234567,8` shown as `1.234.567,8`. */
export function groupInput(input: string): string {
  const [integer, decimals] = input.split(',');
  const grouped = (integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimals === undefined ? grouped : `${grouped},${decimals}`;
}

/** The amount being typed, large, with an optional line under it. */
export function AmountDisplay({ input, label, caption }: { input: string; label: string; caption?: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${groupInput(input)} euro`} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
      <AppText variant="amountInput" tone={input ? 'primary' : 'tertiary'} numberOfLines={1} adjustsFontSizeToFit>
        {groupInput(input)}
        <AppText variant="displayCents" tone="secondary">
          {' €'}
        </AppText>
      </AppText>
      {caption ? (
        <AppText variant="subhead" tone="secondary" numberOfLines={1}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

/** Keypad and the save button, pinned under the form. The button says what is still missing. */
export function SaveBar({
  onKey,
  onClear,
  label,
  ready,
  busy,
  onSave,
  another,
}: {
  onKey: (key: KeypadKey) => void;
  onClear: () => void;
  label: string;
  ready: boolean;
  busy: boolean;
  onSave: () => void;
  /** «Un'altra»: save and keep the sheet open for the next one, beside the main button. */
  another?: { label: string; accessibilityLabel: string; onPress: () => void };
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, gap: spacing.smd, borderTopWidth: 1, borderTopColor: colors.hairline }}>
      <Keypad onKey={onKey} onClear={onClear} />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {another ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={another.accessibilityLabel}
            accessibilityState={{ disabled: !ready, busy }}
            disabled={!ready}
            onPress={another.onPress}
            style={{ minHeight: 56, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.control, borderCurve: 'continuous', backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}
          >
            <AppText variant="bodyStrong">{another.label}</AppText>
          </PressableScale>
        ) : null}
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy }}
          disabled={!ready}
          onPress={onSave}
          style={{ flex: 1, minHeight: 56, paddingVertical: spacing.sm, borderRadius: radius.control, borderCurve: 'continuous', backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="bodyStrong" tone="onInk" numberOfLines={1} adjustsFontSizeToFit>
            {label}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  autoFocus,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="footnote" tone="secondary">
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkTertiary}
        selectionColor={colors.ink}
        autoFocus={autoFocus}
        keyboardType={keyboardType}
        style={[type.body, { color: colors.ink, minHeight: 48, paddingHorizontal: spacing.smd, borderRadius: radius.key, backgroundColor: colors.surfaceMuted }]}
      />
    </View>
  );
}

/** "Dettagli": optional fields stay folded until asked for. */
export function DetailsSection({ open, onToggle, hint, children }: { open: boolean; onToggle: () => void; hint: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        feedback="dim"
        onPress={onToggle}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, borderTopWidth: 1, borderBottomWidth: open ? 0 : 1, borderColor: colors.hairline }}
      >
        <AppText variant="callout">
          {it.add.details}
          <AppText variant="subhead" tone="secondary">{`  ${hint}`}</AppText>
        </AppText>
        <Icon name={open ? 'CaretDown' : 'CaretRight'} size={16} color={colors.inkSecondary} />
      </PressableScale>
      {open ? <View style={{ gap: spacing.smd }}>{children}</View> : null}
    </>
  );
}

/** A labelled row of choices: "Da", "A", "Tipo di entrata". */
export function ChoiceRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="subheadStrong" tone="secondary">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>
    </View>
  );
}
