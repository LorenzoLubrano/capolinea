import { useState } from 'react';
import { View } from 'react-native';

import { addMonthsClamped, monthGrid, monthStart } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';
import { it } from '@/i18n/it';
import { fullDate, monthYear } from '@/services/format/dates';
import { haptics } from '@/services/haptics';
import { radius, spacing, useTheme } from '@/theme';

import { Icon } from './icon';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

const CELL = 44;

/** A month grid, Monday first. Today has a ring, the chosen day is ink. Same look on every platform. */
export function Calendar({ value, today, onChange }: { value: LocalDate; today: LocalDate; onChange: (date: LocalDate) => void }) {
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
            return (
              <PressableScale
                key={day}
                accessibilityRole="button"
                accessibilityLabel={fullDate(day)}
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
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}
