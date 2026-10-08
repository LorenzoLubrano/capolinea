import { View } from 'react-native';

import { it } from '@/i18n/it';
import { radius, spacing, useTheme } from '@/theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];
const KEY = 76;

/** Digits only, large round keys, no comma: for PINs. */
export function PinPad({ onDigit, onBack, disabled }: { onDigit: (digit: string) => void; onBack: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: spacing.smd, columnGap: spacing.lg, maxWidth: 3 * KEY + 2 * spacing.lg, alignSelf: 'center', opacity: disabled ? 0.4 : 1 }}>
      {KEYS.map((key, i) =>
        key === '' ? (
          <View key={i} style={{ width: KEY, height: KEY }} />
        ) : (
          <PressableScale
            key={i}
            accessibilityRole="button"
            accessibilityLabel={key === 'back' ? it.pin.delete : key}
            accessibilityState={{ disabled: !!disabled }}
            disabled={disabled}
            onPress={() => (key === 'back' ? onBack() : onDigit(key))}
            style={{ width: KEY, height: KEY, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: key === 'back' ? 'transparent' : colors.surfaceMuted }}
          >
            {key === 'back' ? <Icon name="Backspace" size={26} color={colors.ink} /> : <AppText variant="key">{key}</AppText>}
          </PressableScale>
        ),
      )}
    </View>
  );
}

/** One ring per digit, filled as they are typed. Never shows the digits. */
export function PinDots({ slots, filled }: { slots: number; filled: number }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityLabel={it.pin.typed(filled)} style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg }}>
      {Array.from({ length: slots }, (_, i) => (
        <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.ink, backgroundColor: i < filled ? colors.ink : 'transparent' }} />
      ))}
    </View>
  );
}
