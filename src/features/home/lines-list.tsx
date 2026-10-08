import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { PressableScale } from '@/components/pressable-scale';
import { ProgressLine } from '@/components/progress-line';
import { Money } from '@/components/money';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { spacing, useTheme } from '@/theme';

import type { HomeSummary } from './summary';

/** The largest categories as metro lines: badge, name, spending against its own budget. */
export function LinesList({ summary }: { summary: HomeSummary }) {
  const { colors, lineColor } = useTheme();
  const { currency } = summary;

  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="title3" accessibilityRole="header">
        {it.home.lines}
      </AppText>
      {summary.lines.map((line) => {
        const ratio = line.budgetMinor ? line.spentMinor / line.budgetMinor : null;
        const over = line.status === 'over';
        // The same words as Budget, from the line's own forecast.
        const warn = line.status === 'near' || line.status === 'trending_over' || line.status === 'full';
        return (
          <PressableScale
            key={line.categoryId}
            accessibilityRole="button"
            feedback="dim"
            onPress={() => router.push({ pathname: '/category/[id]', params: { id: line.categoryId } })}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.smd,
              paddingVertical: spacing.smd,
              borderBottomWidth: 1,
              borderBottomColor: colors.hairline,
            }}
          >
            <LineBadge color={line.color} icon={line.icon} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm }}>
                <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {line.name}
                </AppText>
                <Money minor={line.spentMinor} currency={currency} variant="bodyStrong" wholeUnits label={line.name} />
              </View>
              {line.budgetMinor ? (
                <>
                  <ProgressLine ratio={ratio!} color={lineColor(line.color).fill} edge={lineColor(line.color).edge} height={4} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    {over || warn ? <Icon name="Warning" size={12} weight="bold" color={over ? colors.alert : colors.warning} /> : null}
                    {over ? (
                      <>
                        <AppText variant="footnote" tone="alert">
                          {it.home.band.overBy}
                        </AppText>
                        <Money minor={line.spentMinor - line.budgetMinor} currency={currency} variant="footnote" tone="alert" wholeUnits />
                      </>
                    ) : (
                      <>
                        <AppText variant="footnote" tone={warn ? 'warning' : 'secondary'} numberOfLines={1} style={{ flexShrink: 1 }}>
                          {warn && line.status ? `${it.budget.statusWords[line.status]} · ${it.home.budget.toLowerCase()}` : it.home.budget}
                        </AppText>
                        <Money minor={line.budgetMinor} currency={currency} variant="footnote" tone={warn ? 'warning' : 'secondary'} wholeUnits />
                      </>
                    )}
                  </View>
                </>
              ) : (
                <AppText variant="footnote" tone="secondary">
                  {it.home.noBudget}
                </AppText>
              )}
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}
