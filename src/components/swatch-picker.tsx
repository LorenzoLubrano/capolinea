import { View } from 'react-native';

import { it } from '@/i18n/it';
import { haptics } from '@/services/haptics';
import { radius, spacing, useTheme } from '@/theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

/** A labelled grid of icons, one of them chosen. */
export function IconPicker({ label, icons, value, onChange }: { label: string; icons: string[]; value: string; onChange: (icon: string) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="subheadStrong" tone="secondary">
        {label}
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {icons.map((name) => {
          const selected = name === value;
          return (
            <PressableScale
              key={name}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={it.pickers.iconLabel(it.pickers.iconNames[name] ?? name)}
              onPress={() => {
                haptics.selection();
                onChange(name);
              }}
              style={{ width: 48, height: 48, borderRadius: radius.key, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.ink : colors.surfaceMuted }}
            >
              <Icon name={name} size={22} color={selected ? colors.onInk : colors.ink} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}

/** A labelled row of line colours, one of them chosen. */
export function ColorPicker({ label, keys, value, onChange }: { label: string; keys: string[]; value: string; onChange: (key: string) => void }) {
  const { colors, lineColor } = useTheme();
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="subheadStrong" tone="secondary">
        {label}
      </AppText>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {keys.map((key) => {
          const selected = key === value;
          return (
            <PressableScale
              key={key}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={it.pickers.colorLabel(it.pickers.colorNames[key] ?? key)}
              onPress={() => {
                haptics.selection();
                onChange(key);
              }}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, borderWidth: 2, borderColor: selected ? colors.ink : 'transparent' }}
            >
              <View style={{ width: 30, height: 30, borderRadius: radius.full, backgroundColor: lineColor(key).fill }} />
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
