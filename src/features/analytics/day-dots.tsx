import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/text';
import { magnitudeLevel, type Bucket, type Period } from '@/domain/analysis';
import { monthGrid } from '@/domain/dates';
import { it } from '@/i18n/it';
import { dayLabel, monthName } from '@/services/format/dates';
import { formatMoney, speakable } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

/**
 * A fixed ramp, the same in every period, so a dot always means the same amount:
 * under 15, 15–40, 40–100, over 100 (in the currency's main unit).
 */
export const DAY_RAMP = [1500, 4000, 10000];
const SIZES = [4, 6, 10, 14, 18];
const SMALL_SIZES = [2, 3, 5, 7, 9];

function Dot({ level, size, today, sizes }: { level: number; size: number; today?: boolean; sizes: number[] }) {
  const { colors } = useTheme();
  const d = sizes[level];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {today ? (
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: colors.ink }} />
      ) : null}
      <View
        style={
          level === 0
            ? { width: d, height: d, borderRadius: d / 2, borderWidth: 1, borderColor: colors.inkTertiary }
            : { width: d, height: d, borderRadius: d / 2, backgroundColor: colors.ink }
        }
      />
    </View>
  );
}

/** Legend of the ramp: four dots with the amounts they stand for. */
function Legend({ currency }: { currency: string }) {
  const masked = useSettings((s) => s.privacy);
  const money = (minor: number) => formatMoney(minor, currency, { wholeUnits: true });
  const [a, b, c] = DAY_RAMP;
  const labels = masked
    ? it.analytics.days.legendMasked
    : [it.analytics.days.below(money(a)), `${money(a).replace(/\s?\D+$/, '')}–${money(b)}`, `${money(b).replace(/\s?\D+$/, '')}–${money(c)}`, it.analytics.days.above(money(c))];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {labels.map((label, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Dot level={i + 1} size={18} sizes={SIZES} />
          {label ? (
            <AppText variant="caption" tone="tertiary">
              {label}
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/**
 * Daily spending as dots on the fixed ramp: a row for a week, a calendar for a month, a strip per
 * month for a year. Today has a ring. In a week or a month a day can be tapped to read its amount.
 */
export function DayDots({
  buckets,
  period,
  today,
  firstMovement,
  currency,
  summary,
}: {
  buckets: Bucket[];
  period: Period;
  today: string;
  /** Days before it have no data: they show nothing rather than an empty dot. */
  firstMovement: string | null;
  currency: string;
  summary: string;
}) {
  const { colors } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const [selected, setSelected] = useState<string | null>(null);
  // Days before the data starts read like days still to come: no dot, not "nothing spent".
  const byDate = new Map(buckets.map((b) => [b.from, firstMovement && b.from < firstMovement ? { ...b, future: true } : b]));
  const money = (minor: number) => formatMoney(minor, currency, { masked, wholeUnits: true });
  const interactive = period.unit !== 'year';
  const pickable = [...byDate.values()].filter((b) => !b.future);
  const current = selected && byDate.has(selected) ? byDate.get(selected)! : null;
  const describe = (b: Bucket) => it.analytics.days.selected(dayLabel(b.from, today), b.spentMinor > 0 ? money(b.spentMinor) : it.analytics.days.none);

  const select = (date: string) => {
    const bucket = byDate.get(date);
    if (!bucket || bucket.future || date === selected) return;
    haptics.selection();
    setSelected(date);
  };
  const move = (delta: number) => {
    const index = pickable.findIndex((b) => b.from === current?.from);
    const next = pickable[index === -1 ? (delta > 0 ? 0 : pickable.length - 1) : index + delta];
    if (next) select(next.from);
  };

  const cell = (date: string | null, size: number, sizes: number[], showNumber: boolean) => {
    const bucket = date ? byDate.get(date) : undefined;
    if (!date || !bucket) return <View key={date ?? 'empty'} style={{ flex: 1 }} />;
    const isSelected = date === current?.from;
    return (
      <Pressable
        key={date}
        disabled={!interactive || bucket.future}
        onPress={() => select(date)}
        importantForAccessibility="no"
        style={{ flex: 1, alignItems: 'center', gap: 2, paddingVertical: showNumber ? 2 : 0 }}
      >
        {showNumber ? (
          <AppText variant="caption" tone={isSelected ? 'primary' : 'tertiary'} style={{ fontSize: 11, lineHeight: 13 }}>
            {Number(date.slice(8))}
          </AppText>
        ) : null}
        {bucket.future ? <View style={{ width: size, height: size }} /> : <Dot level={magnitudeLevel(bucket.spentMinor, DAY_RAMP)} size={size} today={date === today} sizes={sizes} />}
        {showNumber ? <View style={{ width: 12, height: 2, borderRadius: 1, backgroundColor: isSelected ? colors.ink : 'transparent' }} /> : null}
      </Pressable>
    );
  };

  let grid: ReactNode;
  if (period.unit === 'week') {
    grid = (
      <View style={{ flexDirection: 'row' }}>
        {[...byDate.values()].map((b, i) => (
          <View key={b.from} style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
            <AppText variant="caption" tone="tertiary">
              {it.analytics.days.weekdayInitials[i]}
            </AppText>
            {cell(b.from, 24, SIZES, true)}
            <AppText variant="caption" tone={b.future ? 'tertiary' : 'secondary'} numberOfLines={1}>
              {b.future ? ' ' : money(b.spentMinor)}
            </AppText>
          </View>
        ))}
      </View>
    );
  } else if (period.unit === 'month') {
    grid = (
      <View style={{ gap: spacing.xxs }}>
        <View style={{ flexDirection: 'row' }}>
          {it.analytics.days.weekdayInitials.map((d, i) => (
            <AppText key={i} variant="caption" tone="tertiary" style={{ flex: 1, textAlign: 'center' }}>
              {d}
            </AppText>
          ))}
        </View>
        {monthGrid(period.from).map((week, w) => (
          <View key={w} style={{ flexDirection: 'row' }}>
            {week.map((date, d) => (date ? cell(date, 22, SIZES, true) : <View key={`${w}-${d}`} style={{ flex: 1 }} />))}
          </View>
        ))}
      </View>
    );
  } else {
    const year = period.from.slice(0, 4);
    grid = (
      <View style={{ gap: 3 }}>
        {Array.from({ length: 12 }, (_, m) => {
          const month = `${year}-${String(m + 1).padStart(2, '0')}`;
          return (
            <View key={month} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppText variant="caption" tone="tertiary" style={{ width: 16, fontSize: 11, lineHeight: 13 }}>
                {monthName(`${month}-01`).charAt(0).toUpperCase()}
              </AppText>
              {Array.from({ length: 31 }, (_, d) => {
                const date = `${month}-${String(d + 1).padStart(2, '0')}`;
                return byDate.has(date) ? cell(date, 10, SMALL_SIZES, false) : <View key={date} style={{ flex: 1 }} />;
              })}
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {interactive ? (
        <AppText variant="subheadStrong" importantForAccessibility="no" accessibilityElementsHidden style={{ minHeight: 19 }}>
          {current ? describe(current) : ''}
        </AppText>
      ) : null}
      <View
        accessible
        accessibilityRole={interactive ? 'adjustable' : 'image'}
        accessibilityLabel={speakable(it.analytics.days.chartLabel(summary))}
        accessibilityValue={current ? { text: describe(current) } : undefined}
        accessibilityActions={interactive ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
        onAccessibilityAction={(event) => move(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
      >
        {grid}
      </View>
      <Legend currency={currency} />
    </View>
  );
}
