import { useState } from 'react';
import { View } from 'react-native';

import { BarChart } from '@/components/bar-chart';
import { AppText } from '@/components/text';
import type { PeriodUnit } from '@/domain/analysis';
import { it } from '@/i18n/it';
import { formatMoney } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

import type { TrendChart } from './analysis';
import { barLabel, barTitle } from './words';

/** Two short dashes, the legend sample of a dashed line. */
function DashSample() {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      <View style={{ width: 6, height: 2, backgroundColor: colors.ink }} />
      <View style={{ width: 6, height: 2, backgroundColor: colors.ink }} />
    </View>
  );
}

/**
 * Up to six weeks or months ending with the analysed one (or the months of a year), with the usual as a
 * dashed line. Tapping a bar reads its value in the line above the chart.
 */
export function TrendChartView({ trend, unit, color, currency }: { trend: TrendChart; unit: PeriodUnit; color: string; currency: string }) {
  const masked = useSettings((s) => s.privacy);
  const [selected, setSelected] = useState<string | null>(null);
  const money = (minor: number) => formatMoney(minor, currency, { masked, wholeUnits: true });
  const { buckets, forecast, usualMinor } = trend;
  const last = buckets.length - 1;
  const key = selected && buckets.some((b) => b.from === selected) ? selected : buckets[trend.selectedIndex]?.from;
  const selectedIndex = buckets.findIndex((b) => b.from === key);

  const describe = (index: number) => {
    const bucket = buckets[index];
    if (!bucket) return '';
    const title = barTitle(bucket, unit);
    if (bucket.future) return it.analytics.usual.selected(title, it.analytics.usual.future);
    if (forecast?.index === index) return it.analytics.usual.selectedForecast(title, money(bucket.spentMinor), money(forecast.amountMinor));
    return it.analytics.usual.selected(title, money(bucket.spentMinor));
  };
  // The line is a whole typical period; "di solito" above the chart is the same days so far.
  const usualText = usualMinor !== null ? it.analytics.usual.line[unit === 'week' ? 'week' : 'month'](money(usualMinor)) : null;
  const summary = [
    ...buckets.map((b, i) => (b.future ? null : describe(i))).filter(Boolean),
    usualText,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="subheadStrong" importantForAccessibility="no" accessibilityElementsHidden>
        {describe(selectedIndex)}
      </AppText>
      <BarChart
        bars={buckets.map((b, i) => ({
          key: b.from,
          value: b.spentMinor,
          label: barLabel(b, unit),
          emphasized: trend.emphasis === 'all' ? !b.future : i === last,
          future: b.future,
          forecast: forecast?.index === i ? forecast.amountMinor : undefined,
        }))}
        color={color}
        reference={usualMinor}
        selectedKey={key}
        onSelect={setSelected}
        accessibilityLabel={it.analytics.usual.chartLabel(summary)}
        accessibilityValue={describe(selectedIndex)}
      />
      {usualText || forecast ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {usualText ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <DashSample />
              <AppText variant="caption" tone="tertiary">
                {usualText}
              </AppText>
            </View>
          ) : null}
          {forecast ? (
            <AppText variant="caption" tone="tertiary">
              {it.analytics.usual.forecast}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
