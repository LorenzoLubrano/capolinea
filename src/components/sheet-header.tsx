import { View } from 'react-native';

import { spacing } from '@/theme';

import { PressableScale } from './pressable-scale';
import { AppText } from './text';

interface SheetAction {
  label: string;
  onPress: () => void;
}

/** Top row of a sheet: a text action on each side, the title in the middle. */
export function SheetHeader({ title, left, right }: { title: string; left?: SheetAction; right?: SheetAction }) {
  const action = (a: SheetAction | undefined, align: 'flex-start' | 'flex-end') =>
    a ? (
      <PressableScale
        accessibilityRole="button"
        feedback="dim"
        onPress={a.onPress}
        style={{ minHeight: 44, minWidth: 80, justifyContent: 'center', alignItems: align, paddingHorizontal: spacing.sm }}
      >
        <AppText variant="callout">{a.label}</AppText>
      </PressableScale>
    ) : (
      <View style={{ minWidth: 80 }} />
    );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingTop: spacing.smd, minHeight: 52 }}>
      {action(left, 'flex-start')}
      <AppText variant="title3" accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1 }}>
        {title}
      </AppText>
      {action(right, 'flex-end')}
    </View>
  );
}
