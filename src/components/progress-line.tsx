import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

/**
 * A budget as a line: filled in the category colour, red only once over budget. The optional tick
 * marks where the spending should be today (the month's pace).
 */
export function ProgressLine({ ratio, color, pace, height = 6 }: { ratio: number; color: string; pace?: number; height?: number }) {
  const { colors } = useTheme();
  const over = ratio > 1;
  return (
    <View style={{ height: height + 8, justifyContent: 'center' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={{ height, borderRadius: radius.full, backgroundColor: colors.track, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%`, height: '100%', borderRadius: radius.full, backgroundColor: over ? colors.alert : color }} />
      </View>
      {pace !== undefined ? (
        <View
          style={{
            position: 'absolute',
            left: `${Math.min(Math.max(pace, 0), 1) * 100}%`,
            width: 2,
            height: height + 8,
            marginLeft: -1,
            borderRadius: 1,
            backgroundColor: colors.ink,
          }}
        />
      ) : null}
    </View>
  );
}
