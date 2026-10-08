import { View } from 'react-native';

import { haptics } from '@/services/haptics';
import { radius, shadows, spacing, useTheme } from '@/theme';

import { PressableScale } from './pressable-scale';
import { AppText } from './text';

/** Two to four peer views of one screen. Switching never slides: the content just changes. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{ flexDirection: 'row', padding: 3, borderRadius: radius.control, borderCurve: 'continuous', backgroundColor: colors.surfaceMuted }}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            feedback="dim"
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: spacing.sm,
              borderRadius: radius.control - 3,
              borderCurve: 'continuous',
              // Lighter than the track in both themes, with an edge: the choice never rests on text colour alone.
              backgroundColor: selected ? colors.selection : 'transparent',
              borderWidth: 1,
              borderColor: selected ? colors.glassBorder : 'transparent',
              boxShadow: selected ? shadows.floating : undefined,
            }}
          >
            <AppText variant="subheadStrong" tone={selected ? 'primary' : 'secondary'} numberOfLines={1}>
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}
