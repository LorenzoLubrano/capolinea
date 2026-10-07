import { useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { formatPercent } from '@/services/format/numbers';
import { spacing, useTheme } from '@/theme';

import type { HomeSummary } from './summary';

/** "Speso a ottobre": the first thing the eye lands on, then the comparison in words. */
export function SpentHero({ summary }: { summary: HomeSummary }) {
  const { colors } = useTheme();
  const reduced = useReducedMotion();
  const [firstValue] = useState(summary.spentMinor);
  // The new total fades in after a save; the first render just appears.
  const entering =
    summary.spentMinor === firstValue ? undefined : reduced ? FadeIn.duration(200) : FadeInDown.duration(250);

  const { change } = summary.comparison;
  const month = summary.previousMonthName;
  const comparison =
    change === null
      ? it.home.comparison.none
      : Math.abs(change) < 0.005
        ? it.home.comparison.same(month)
        : change < 0
          ? it.home.comparison.less(formatPercent(change), month)
          : it.home.comparison.more(formatPercent(change), month);

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="callout" tone="secondary">
        {it.home.spentIn(summary.monthName)}
      </AppText>
      <Animated.View key={summary.spentMinor} entering={entering}>
        <Money
          minor={summary.spentMinor}
          currency={summary.currency}
          variant="display"
          centsVariant="displayCents"
          label={it.home.spentIn(summary.monthName)}
        />
      </Animated.View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs }}>
        {change !== null && Math.abs(change) >= 0.005 ? (
          <Icon name={change < 0 ? 'ArrowDown' : 'ArrowUp'} size={14} color={colors.ink} weight="bold" />
        ) : null}
        <AppText variant="subhead" tone="secondary" style={{ flexShrink: 1 }}>
          {comparison}
        </AppText>
      </View>
    </View>
  );
}
