import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { PressableScale } from '@/components/pressable-scale';
import { Money } from '@/components/money';
import { AppText } from '@/components/text';
import { budgetStatus } from '@/domain/budget';
import { it } from '@/i18n/it';
import { radius, spacing, useTheme } from '@/theme';

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
        // The same words as Budget; pace 1 because the lines speak of the limit, not of the pace.
        const status = line.budgetMinor ? budgetStatus({ spentMinor: line.spentMinor, budgetMinor: line.budgetMinor, pace: 1 }) : null;
        const over = status === 'over';
        const full = status === 'full';
        const near = status === 'near' || full;
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
            <LineBadge color={line.color} name={line.name} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm }}>
                <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {line.name}
                </AppText>
                <Money minor={line.spentMinor} currency={currency} variant="bodyStrong" wholeUnits label={line.name} />
              </View>
              {line.budgetMinor ? (
                <>
                  <View style={{ height: 4, borderRadius: radius.full, backgroundColor: colors.track, overflow: 'hidden' }}>
                    <View
                      style={{
                        width: `${Math.min(ratio! * 100, 100)}%`,
                        height: '100%',
                        borderRadius: radius.full,
                        backgroundColor: lineColor(line.color).fill,
                      }}
                    />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    {over || near ? <Icon name="Warning" size={12} weight="bold" color={over ? colors.alert : colors.warning} /> : null}
                    {over ? (
                      <>
                        <AppText variant="footnote" tone="alert">
                          {it.home.overBy}
                        </AppText>
                        <Money minor={line.spentMinor - line.budgetMinor} currency={currency} variant="footnote" tone="alert" wholeUnits />
                      </>
                    ) : (
                      <>
                        <AppText variant="footnote" tone={near ? 'warning' : 'secondary'}>
                          {near ? `${full ? it.home.atLimit : it.home.nearLimit} · ${it.home.budget.toLowerCase()}` : it.home.budget}
                        </AppText>
                        <Money minor={line.budgetMinor} currency={currency} variant="footnote" tone={near ? 'warning' : 'secondary'} wholeUnits />
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
