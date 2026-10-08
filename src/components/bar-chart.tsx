import { Pressable, View } from 'react-native';

import { haptics } from '@/services/haptics';
import { radius, spacing, useTheme } from '@/theme';

import { AppText } from './text';

/** Few bars stay bar-shaped instead of turning into blocks. */
const MAX_BAR = 56;

export interface ChartBar {
  key: string;
  /** Minor units; anything below zero draws as zero. */
  value: number;
  /** Under the bar: `ott`, `12 ott`, `G`. */
  label: string;
  /** Part of what is being analysed: drawn in the strong colour. */
  emphasized?: boolean;
  /** Not reached yet: no bar, only the label. */
  future?: boolean;
  /** Dashed outline up to this value: the forecast. */
  forecast?: number;
}

/** A dashed horizontal line made of segments: Android draws no dashed border on a single side. */
export function DashedRule({ bottom, color }: { bottom: number; color: string }) {
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom, height: 2, flexDirection: 'row', gap: 4, overflow: 'hidden', pointerEvents: 'none' }}>
      {Array.from({ length: 60 }, (_, i) => (
        <View key={i} style={{ width: 6, height: 2, backgroundColor: color }} />
      ))}
    </View>
  );
}

/**
 * Vertical bars with an optional dashed reference line (a budget, an average). Solid is spent, a
 * dashed outline is the forecast. With `onSelect` a bar can be tapped, or moved with the screen
 * reader's adjust gesture, to read its value; the chart is one element for screen readers.
 */
export function BarChart({
  bars,
  color,
  height = 112,
  reference,
  selectedKey,
  onSelect,
  accessibilityLabel,
  accessibilityValue,
}: {
  bars: ChartBar[];
  color: string;
  height?: number;
  reference?: number | null;
  selectedKey?: string;
  onSelect?: (key: string) => void;
  /** The whole chart in words. */
  accessibilityLabel: string;
  /** The selected bar in words. */
  accessibilityValue?: string;
}) {
  const { colors } = useTheme();
  const scale = Math.max(1, reference ?? 0, ...bars.map((b) => Math.max(b.value, b.forecast ?? 0)));
  const toHeight = (value: number) => (value > 0 ? Math.max((value / scale) * height, 2) : 0);
  const selectedIndex = bars.findIndex((b) => b.key === selectedKey);

  const select = (index: number) => {
    const bar = bars[index];
    if (!bar || !onSelect || bar.key === selectedKey) return;
    haptics.selection();
    onSelect(bar.key);
  };

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={onSelect ? 'adjustable' : 'image'}
      accessibilityValue={accessibilityValue ? { text: accessibilityValue } : undefined}
      accessibilityActions={onSelect ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
      onAccessibilityAction={(event) => select(selectedIndex + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}
      style={{ gap: spacing.xs }}
    >
      <View style={{ height, flexDirection: 'row', alignItems: 'flex-end', gap: bars.length > 8 ? spacing.xs : spacing.sm }}>
        {bars.map((bar, index) => {
          const selected = index === selectedIndex;
          // Other bars stay grey but readable (3:1 against the page); a tapped one darkens.
          const fill = bar.emphasized ? color : selected ? colors.inkSecondary : colors.inkTertiary;
          const solid = toHeight(bar.value);
          const dashed = bar.forecast !== undefined && bar.forecast > bar.value ? toHeight(bar.forecast) : 0;
          return (
            <Pressable
              key={bar.key}
              disabled={!onSelect}
              onPress={() => select(index)}
              importantForAccessibility="no"
              style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' }}
            >
              <View style={{ width: '100%', maxWidth: MAX_BAR, height: '100%', justifyContent: 'flex-end' }}>
              {dashed ? (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: dashed,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: color,
                    borderRadius: radius.badge,
                  }}
                />
              ) : null}
              {bar.future ? null : <View style={{ height: solid, borderRadius: radius.badge, backgroundColor: fill }} />}
              </View>
            </Pressable>
          );
        })}
        {reference ? <DashedRule bottom={(reference / scale) * height} color={colors.ink} /> : null}
      </View>
      <View style={{ flexDirection: 'row', gap: bars.length > 8 ? spacing.xs : spacing.sm }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {bars.map((bar, index) => (
          <View key={bar.key} style={{ flex: 1, alignItems: 'center', gap: spacing.xxs }}>
            <AppText variant="caption" tone={index === selectedIndex ? 'primary' : 'tertiary'} numberOfLines={1}>
              {bar.label}
            </AppText>
            <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: index === selectedIndex && onSelect ? colors.ink : 'transparent' }} />
          </View>
        ))}
      </View>
    </View>
  );
}
