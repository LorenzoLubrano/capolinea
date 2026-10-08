import { useState } from 'react';
import { View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { StatusLine } from '@/components/status-line';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { formatMoney, speakable } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { motion, radius, spacing, useTheme } from '@/theme';

import type { HomeSummary } from './summary';

const BAND = 32;
const RING = 16;
const LABEL_ROW = 20;
/** Space before a segment name. */
const LABEL_INSET = spacing.xs + 2;

/**
 * The signature move: the month as one metro band. Segments are categories in their line colour,
 * the dashed extension is the forecast, the ring is where today says the spending should be,
 * the black bar is the budget terminus.
 */
export function MonthBand({ summary, compact = false }: { summary: HomeSummary; compact?: boolean }) {
  const { colors, lineColor } = useTheme();
  const reduced = useReducedMotion();
  const masked = useSettings((s) => s.privacy);
  const [width, setWidth] = useState(0);
  const { band, budget, currency, spentMinor } = summary;

  const spentRatio = band.segments.reduce((sum, s) => sum + s.ratio, 0);
  const transition = {
    transitionProperty: ['left', 'width'] as ('left' | 'width')[],
    transitionDuration: reduced ? 0 : motion.slow,
    transitionTimingFunction: motion.easeOut,
  };

  const segments = band.segments.map((segment, i) => ({
    ...segment,
    left: band.segments.slice(0, i).reduce((sum, s) => sum + s.ratio, 0),
  }));

  const ringX = Math.min(Math.max(band.paceRatio * width, RING / 2), width - RING / 2);
  const money = (minor: number) => formatMoney(minor, currency, { masked, wholeUnits: true });
  const a11y = budget
    ? it.home.band.a11y(money(spentMinor), money(budget.amountMinor), money(budget.forecastMinor))
    : it.home.band.noBudget;

  return (
    <View style={{ gap: spacing.sm }}>
      {compact ? null : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.home.band.title}
          </AppText>
          {budget ? (
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
              <AppText variant="footnote" tone="secondary">
                {it.home.band.terminus}
              </AppText>
              <Money minor={budget.amountMinor} currency={currency} variant="subheadStrong" wholeUnits />
            </View>
          ) : null}
        </View>
      )}

      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={speakable(a11y)}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: LABEL_ROW + BAND }}
      >
        {width > 0 ? (
          <>
            <View
              style={{
                position: 'absolute',
                top: LABEL_ROW,
                left: 0,
                right: 0,
                height: BAND,
                borderRadius: radius.sign,
                borderCurve: 'continuous',
                backgroundColor: colors.track,
                overflow: 'hidden',
              }}
            >
              {segments.map((segment) => {
                const line = lineColor(segment.color);
                const segmentWidth = segment.ratio * width;
                const segmentLeft = segment.left * width;
                const textWidth = segment.name.length * 7;
                // The today stem crosses the band: a name it would cut starts after it, or is left out.
                const stemInside = budget !== null && ringX >= segmentLeft && ringX <= segmentLeft + LABEL_INSET + textWidth + spacing.xs;
                const inset = stemInside ? ringX - segmentLeft + 1 + LABEL_INSET : LABEL_INSET;
                return (
                  <Animated.View
                    key={segment.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: segment.left * width,
                      width: segmentWidth,
                      backgroundColor: line.fill,
                      justifyContent: 'center',
                      paddingLeft: inset,
                      overflow: 'hidden',
                      ...transition,
                    }}
                  >
                    {segmentWidth > inset + textWidth + 8 ? (
                      <AppText variant="caption" numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ color: line.on }}>
                        {segment.name}
                      </AppText>
                    ) : null}
                  </Animated.View>
                );
              })}
            </View>

            {band.forecastRatio > spentRatio ? (
              <Animated.View
                style={{
                  position: 'absolute',
                  top: LABEL_ROW,
                  height: BAND,
                  left: spentRatio * width,
                  width: (band.forecastRatio - spentRatio) * width,
                  borderWidth: 2,
                  borderLeftWidth: 0,
                  borderStyle: 'dashed',
                  borderColor: colors.inkSecondary,
                  borderTopRightRadius: radius.sign,
                  borderBottomRightRadius: radius.sign,
                  ...transition,
                }}
              />
            ) : null}

            {budget && band.terminusRatio < 1 ? (
              <View
                style={{
                  position: 'absolute',
                  top: LABEL_ROW - 4,
                  left: band.terminusRatio * width - 1.5,
                  width: 3,
                  height: BAND + 8,
                  borderRadius: 2,
                  backgroundColor: colors.ink,
                }}
              />
            ) : null}

            {budget ? (
              <>
                <View
                  style={{
                    position: 'absolute',
                    top: LABEL_ROW - RING / 2,
                    left: ringX - 1,
                    width: 2,
                    height: BAND + RING / 2,
                    backgroundColor: colors.ink,
                  }}
                />
                <View
                  style={{
                    position: 'absolute',
                    top: LABEL_ROW - RING,
                    left: ringX - RING / 2,
                    width: RING,
                    height: RING,
                    borderRadius: RING / 2,
                    borderWidth: 3,
                    borderColor: colors.ink,
                    backgroundColor: colors.background,
                  }}
                />
                <AppText
                  variant="caption"
                  maxFontSizeMultiplier={1.2}
                  style={{
                    position: 'absolute',
                    top: 0,
                    ...(band.paceRatio > 0.75 ? { right: width - ringX + RING / 2 + spacing.xs } : { left: ringX + RING / 2 + spacing.xs }),
                  }}
                >
                  {it.home.band.today}
                </AppText>
              </>
            ) : null}
          </>
        ) : null}
      </View>

      {compact ? null : budget ? (
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', columnGap: spacing.sm, rowGap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
              {budget.remainingMinor < 0 ? <Icon name="Warning" size={14} weight="bold" color={colors.alert} /> : null}
              <AppText variant="subhead" tone={budget.remainingMinor < 0 ? 'alert' : 'secondary'}>
                {budget.remainingMinor < 0 ? it.home.band.overBy : it.home.band.remaining}
              </AppText>
              <Money
                minor={Math.abs(budget.remainingMinor)}
                currency={currency}
                variant="subheadStrong"
                tone={budget.remainingMinor < 0 ? 'alert' : 'primary'}
                wholeUnits
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View style={{ width: 14, height: 10, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.inkSecondary, borderRadius: 2 }} />
              <AppText variant="subhead" tone="secondary">
                {it.home.band.forecast}
              </AppText>
              <Money minor={budget.forecastMinor} currency={currency} variant="subheadStrong" wholeUnits />
            </View>
          </View>
          {/* Past the terminus the row above already says it, in red: no second line. */}
          {budget.status !== 'over' ? <StatusLine status={budget.status} /> : null}
        </View>
      ) : (
        <AppText variant="footnote" tone="secondary">
          {it.home.band.noBudget}
        </AppText>
      )}
    </View>
  );
}
