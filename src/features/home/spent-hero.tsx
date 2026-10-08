import { View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LayoutAnimationConfig, ReduceMotion } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { useReduceMotion } from '@/services/a11y';
import { motion, spacing, useTheme } from '@/theme';

import type { HomeSummary } from './summary';
import { comparisonLine } from './words';

const RISE_IN = FadeInDown.duration(motion.base).easing(motion.easeOutTiming);
const FADE_IN = FadeIn.duration(motion.fast).easing(motion.easeOutTiming).reduceMotion(ReduceMotion.Never);

/** "Speso a ottobre": the first thing the eye lands on, then the comparison in words. */
export function SpentHero({ summary }: { summary: HomeSummary }) {
  const { colors } = useTheme();
  const reduced = useReduceMotion();

  const { change } = summary.comparison;
  const month = summary.previousMonthName;
  const comparison = comparisonLine(change, month);

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="callout" tone="secondary">
        {it.home.spentIn(summary.monthName)}
      </AppText>
      {/* The new total fades in after a save; the first one just appears. */}
      <LayoutAnimationConfig skipEntering>
        <Animated.View key={summary.spentMinor} entering={reduced ? FADE_IN : RISE_IN}>
          <Money
            minor={summary.spentMinor}
            currency={summary.currency}
            variant="display"
            centsVariant="displayCents"
            label={it.home.spentIn(summary.monthName)}
          />
        </Animated.View>
      </LayoutAnimationConfig>
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
