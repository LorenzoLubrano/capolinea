import { TextInput, View } from 'react-native';

import { radius, spacing, type, useTheme } from '@/theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';

/** Search input with a clear button. Results update while typing; there is no submit. */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  label,
  clearLabel,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  label: string;
  clearLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 44,
        paddingLeft: spacing.smd,
        borderRadius: radius.control,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceMuted,
      }}
    >
      <Icon name="MagnifyingGlass" size={18} color={colors.inkSecondary} />
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkTertiary}
        selectionColor={colors.ink}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        style={[type.body, { flex: 1, color: colors.ink, paddingVertical: spacing.sm }]}
      />
      {value ? (
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={clearLabel}
          onPress={() => onChangeText('')}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="X" size={16} color={colors.inkSecondary} weight="bold" />
        </PressableScale>
      ) : null}
    </View>
  );
}
