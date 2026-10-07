import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import type { KeypadKey } from '@/domain/money';
import { it } from '@/i18n/it';
import { radius, spacing, useTheme } from '@/theme';

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  [',', '0', 'backspace'],
];

/** Amount keypad with the Italian decimal comma. Keys dim on press: they are pressed dozens of times a day. */
export function Keypad({ onKey, onClear }: { onKey: (key: KeypadKey) => void; onClear: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      {ROWS.map((row) => (
        <View key={row.join('')} style={{ flexDirection: 'row', gap: spacing.sm }}>
          {row.map((key) => (
            <PressableScale
              key={key}
              feedback="dim"
              accessibilityRole="keyboardkey"
              accessibilityLabel={key === ',' ? it.add.keys.comma : key === 'backspace' ? it.add.keys.backspace : key}
              onPress={() => onKey(key)}
              onLongPress={key === 'backspace' ? onClear : undefined}
              style={{
                flex: 1,
                height: 52,
                borderRadius: radius.key,
                borderCurve: 'continuous',
                backgroundColor: key === 'backspace' || key === ',' ? 'transparent' : colors.surfaceMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {key === 'backspace' ? (
                <Icon name="Backspace" size={26} color={colors.ink} />
              ) : (
                <AppText variant="key">{key}</AppText>
              )}
            </PressableScale>
          ))}
        </View>
      ))}
    </View>
  );
}
