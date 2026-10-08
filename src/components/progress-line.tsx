import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

/**
 * A budget as a line to its terminus, filled in the category colour. Past the terminus the line
 * grows and only the overrun is red, after an ink terminus mark. The optional tick marks where a
 * steady month would be today. `edge` outlines a fill that would melt into the track.
 */
export function ProgressLine({ ratio, color, edge, pace, height = 6 }: { ratio: number; color: string; edge?: string; pace?: number; height?: number }) {
  const { colors } = useTheme();
  const used = Math.max(ratio, 0);
  // Over budget the scale stretches to the spending, so the terminus moves left of the end.
  const scale = Math.max(used, 1);
  const terminus = 1 / scale;
  const over = used > 1;
  return (
    <View style={{ height: height + 8, justifyContent: 'center' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={{ height, borderRadius: radius.full, backgroundColor: colors.track, overflow: 'hidden', flexDirection: 'row' }}>
        <View
          style={{
            width: `${(over ? terminus : used) * 100}%`,
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
        {over ? <View style={{ flex: 1, height: '100%', backgroundColor: colors.alert }} /> : null}
      </View>
      {over ? (
        <View style={{ position: 'absolute', left: `${terminus * 100}%`, width: 3, height: height + 8, marginLeft: -1.5, borderRadius: 2, backgroundColor: colors.ink }} />
      ) : null}
      {pace !== undefined ? (
        <View
          style={{
            position: 'absolute',
            left: `${Math.min(Math.max(pace / scale, 0), 1) * 100}%`,
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
