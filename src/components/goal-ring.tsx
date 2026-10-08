import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme';

/** A savings goal as a ring that closes as the goal fills; anything in `children` sits in the middle. */
export function GoalRing({ ratio, color, size = 48, stroke = 6, children }: { ratio: number; color: string; size?: number; stroke?: number; children?: ReactNode }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(Math.max(ratio, 0), 1) * circumference;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        {filled > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={[filled, circumference]}
          />
        ) : null}
      </Svg>
      {children}
    </View>
  );
}
