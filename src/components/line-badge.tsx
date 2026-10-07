import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

import { AppText } from './text';

/** A category's line badge: a rounded enamel square with the initial, like a metro line sign. */
export function LineBadge({ color, name, size = 26 }: { color: string; name: string; size?: number }) {
  const { lineColor } = useTheme();
  const line = lineColor(color);
  return (
    <View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={{
        width: size,
        height: size,
        borderRadius: radius.badge,
        borderCurve: 'continuous',
        backgroundColor: line.fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText variant="badge" style={{ color: line.on, fontSize: Math.round(size * 0.5) }}>
        {name.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}
