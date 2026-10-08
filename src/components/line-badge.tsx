import { View } from 'react-native';

import { radius, useTheme } from '@/theme';

import { Icon } from './icon';

/**
 * A category's line badge: a rounded enamel square in the line colour with the category's icon,
 * like a metro line sign. Categories only: accounts and goals wear other shapes.
 */
export function LineBadge({ color, icon, size = 26 }: { color: string; icon?: string; size?: number }) {
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
        // The light yellow would melt into the enamel ground: it keeps its darker rim.
        borderWidth: line.edge ? 1 : 0,
        borderColor: line.edge,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon ?? 'Tag'} size={Math.round(size * 0.6)} color={line.on} weight="bold" />
    </View>
  );
}
