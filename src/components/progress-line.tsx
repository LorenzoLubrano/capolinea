import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

/**
 * A budget as a line to its terminus, filled in the category colour. Past the terminus the line
 * grows and only the overrun is red, after an ink terminus mark. `forecast` (a share of the budget,
 * like `ratio`) draws the month-end arrival as a dashed extension, the same sign as the month band.
 * `edge` outlines a fill that would melt into the track.
 */
export function ProgressLine({ ratio, color, edge, forecast, height = 6 }: { ratio: number; color: string; edge?: string; forecast?: number; height?: number }) {
  const { colors } = useTheme();
  const used = Math.max(ratio, 0);
  const arrival = Math.max(forecast ?? 0, used);
  // Past the budget the scale stretches to the spending or the arrival, so the terminus moves left of the end.
  const scale = Math.max(arrival, 1);
  const terminus = 1 / scale;
  const over = used > 1;
  const share = (value: number) => `${(value / scale) * 100}%` as const;
  return (
    <View style={{ height: height + 8, justifyContent: 'center' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={{ height, borderRadius: radius.full, backgroundColor: colors.track, overflow: 'hidden', flexDirection: 'row' }}>
        <View
          style={{
            width: share(Math.min(used, 1)),
            height: '100%',
            backgroundColor: color,
            borderWidth: edge ? 1 : 0,
            borderColor: edge,
            borderTopLeftRadius: radius.full,
            borderBottomLeftRadius: radius.full,
            borderTopRightRadius: over ? 0 : radius.full,
            borderBottomRightRadius: over ? 0 : radius.full,
          }}
        />
        {over ? <View style={{ width: share(used - 1), height: '100%', backgroundColor: colors.alert }} /> : null}
      </View>
      {arrival > used ? (
        <View
          style={{
            position: 'absolute',
            top: 4,
            height,
            left: share(used),
            width: share(arrival - used),
            borderWidth: height > 4 ? 2 : 1,
            borderLeftWidth: 0,
            borderStyle: 'dashed',
            borderColor: colors.inkSecondary,
            borderTopRightRadius: radius.full,
            borderBottomRightRadius: radius.full,
          }}
        />
      ) : null}
      {scale > 1 ? (
        <View style={{ position: 'absolute', left: `${terminus * 100}%`, width: 3, height: height + 8, marginLeft: -1.5, borderRadius: 2, backgroundColor: colors.ink }} />
      ) : null}
    </View>
  );
}
