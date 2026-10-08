import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

import { Icon } from './icon';

/**
 * A savings goal as a line to its terminus: filled in the goal's colour as far as it got, one stop
 * for each contribution where it left the goal, the ink terminus bar at the target.
 */
export function GoalLine({ ratio, stops, color, height = 6 }: { ratio: number; stops: number[]; color: string; height?: number }) {
  const { colors } = useTheme();
  const dot = height + 6;
  return (
    <View style={{ height: dot + 6, justifyContent: 'center' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <View style={{ height, borderRadius: radius.full, backgroundColor: colors.track, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%`, height: '100%', borderRadius: radius.full, backgroundColor: color }} />
      </View>
      {stops.map((share, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${share * 100}%`,
            marginLeft: -dot / 2,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            borderWidth: Math.max(2, height / 3),
            borderColor: color,
            backgroundColor: colors.background,
          }}
        />
      ))}
      <View style={{ position: 'absolute', right: 0, width: 3, height: dot + 6, borderRadius: 2, backgroundColor: colors.ink }} />
    </View>
  );
}

/** A goal's icon on a neutral round ground; a check once reached. */
export function GoalBadge({ icon, reached, size = 40 }: { icon: string; reached: boolean; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={reached ? 'Check' : icon} size={Math.round(size * 0.5)} color={colors.ink} weight={reached ? 'bold' : 'regular'} />
    </View>
  );
}
