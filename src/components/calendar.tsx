import { useState } from 'react';
import { View } from 'react-native';

import { addMonthsClamped, monthGrid, monthStart } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';
import { it } from '@/i18n/it';
import { useAnnounce } from '@/services/a11y';
import { fullDate, monthYear } from '@/services/format/dates';
import { haptics } from '@/services/haptics';
import { radius, spacing, useTheme } from '@/theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

const CELL = 44;

/**
 * A month grid, Monday first. Today has a ring, the chosen day is ink. Same look on every platform.
 * `markers` puts up to three coloured dots under a day (subscription charges, for example).
 */
export function Calendar({
  value,
  today,
  onChange,
  markers,
  markersLabel,
}: {
  value: LocalDate;
  today: LocalDate;
  onChange: (date: LocalDate) => void;
  markers?: Record<LocalDate, string[]>;
  /** Spoken after the date when a day has markers, e.g. "2 addebiti". */
  markersLabel?: (count: number) => string;
}) {
  const { colors } = useTheme();
  const [month, setMonth] = useState(monthStart(value));

  const arrow = (direction: -1 | 1) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={direction < 0 ? it.calendar.previous : it.calendar.next}
      onPress={() => setMonth(addMonthsClamped(month, direction))}
      style={{ width: CELL, height: CELL, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={direction < 0 ? 'CaretLeft' : 'CaretRight'} size={18} color={colors.ink} />
    </PressableScale>
  );

  useAnnounce(monthYear(month), { skipInitial: true });

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {arrow(-1)}
        <AppText variant="bodyStrong" accessibilityRole="header" accessibilityLiveRegion="polite">
          {monthYear(month)}
        </AppText>
        {arrow(1)}
      </View>
      <View style={{ flexDirection: 'row' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {it.calendar.weekdays.map((day, i) => (
          <AppText key={i} variant="caption" tone="tertiary" style={{ flex: 1, textAlign: 'center' }}>
            {day}
          </AppText>
        ))}
      </View>
      {monthGrid(month).map((week, w) => (
        <View key={w} style={{ flexDirection: 'row' }}>
          {week.map((day, d) => {
            if (!day) return <View key={d} style={{ flex: 1, height: CELL }} />;
            const selected = day === value;
            const isToday = day === today;
            const dots = markers?.[day] ?? [];
            return (
              <PressableScale
                key={day}
                accessibilityRole="button"
                accessibilityLabel={dots.length && markersLabel ? `${fullDate(day)}, ${markersLabel(dots.length)}` : fullDate(day)}
                accessibilityState={{ selected }}
                feedback="dim"
                onPress={() => {
                  haptics.selection();
                  onChange(day);
                }}
                style={{ flex: 1, height: CELL, alignItems: 'center', justifyContent: 'center' }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.full,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: selected ? colors.ink : 'transparent',
                    borderWidth: isToday && !selected ? 1.5 : 0,
                    borderColor: colors.ink,
                  }}
                >
                  <AppText variant={selected || isToday ? 'subheadStrong' : 'subhead'} tone={selected ? 'onInk' : 'primary'}>
                    {Number(day.slice(8))}
                  </AppText>
                </View>
                {dots.length ? (
                  <View style={{ position: 'absolute', bottom: 1, flexDirection: 'row', gap: 2 }}>
                    {dots.slice(0, 3).map((color, i) => (
                      <View key={i} style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
                    ))}
                  </View>
                ) : null}
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}
