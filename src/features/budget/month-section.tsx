import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { ProgressLine } from '@/components/progress-line';
import { StatusLine } from '@/components/status-line';
import { AppText } from '@/components/text';
import type { Snapshot } from '@/data/repositories';
import { MonthBand } from '@/features/home/month-band';
import { buildHomeSummary } from '@/features/home/summary';
import { it } from '@/i18n/it';
import { monthName } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

import { buildBudgetOverview } from './overview';

function SpentOf({ spent, budget, currency, variant }: { spent: number; budget: number; currency: string; variant: 'figure' | 'subhead' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flexWrap: 'wrap' }}>
      <Money minor={spent} currency={currency} variant={variant === 'figure' ? 'figure' : 'subheadStrong'} wholeUnits />
      <AppText variant={variant === 'figure' ? 'callout' : 'subhead'} tone="secondary">
        {it.budget.of}
      </AppText>
      <Money minor={budget} currency={currency} variant={variant === 'figure' ? 'callout' : 'subhead'} tone="secondary" wholeUnits />
    </View>
  );
}

/** Mese: the global budget with today's pace, then one line per category budget. */
export function MonthSection({ data }: { data: Snapshot }) {
  const { colors, lineColor } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const overview = buildBudgetOverview(data);
  const summary = buildHomeSummary(data);
  const { global, currency } = { ...overview, currency: data.currency };
  const money = (minor: number) => formatMoney(minor, currency, { masked, wholeUnits: true });

  return (
    <View style={{ gap: spacing.xl }}>
      {global ? (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="title3" accessibilityRole="header">
              {it.budget.monthBudget(monthName(data.today))}
            </AppText>
            <PressableScale
              accessibilityRole="button"
              feedback="dim"
              onPress={() => router.push({ pathname: '/budget-edit', params: { id: global.budgetId } })}
              style={{ minHeight: 44, justifyContent: 'center', paddingLeft: spacing.md }}
            >
              <AppText variant="subheadStrong">{it.budget.edit}</AppText>
            </PressableScale>
          </View>
          <SpentOf spent={global.spentMinor} budget={global.amountMinor} currency={currency} variant="figure" />
          <MonthBand summary={summary} compact />
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flexWrap: 'wrap' }}>
            <AppText variant="subhead" tone="secondary">
              {global.remainingMinor >= 0 ? it.budget.remaining : it.budget.over}
            </AppText>
            <Money minor={Math.abs(global.remainingMinor)} currency={currency} variant="subheadStrong" wholeUnits />
            {global.remainingMinor > 0 ? (
              <AppText variant="subhead" tone="secondary">
                {`· ${it.budget.perDay(money(global.perDayMinor))}`}
              </AppText>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm }}>
            <StatusLine status={global.status} />
            <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'baseline' }}>
              <AppText variant="footnote" tone="secondary">
                {it.budget.forecast}
              </AppText>
              <Money minor={global.forecastMinor} currency={currency} variant="footnote" tone="secondary" wholeUnits />
            </View>
          </View>
          <AppText variant="footnote" tone="tertiary">
            {`${it.budget.daysLeft(overview.daysLeft)} · ${it.budget.paceHint}`}
          </AppText>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title3">{it.budget.none.title}</AppText>
          <AppText tone="secondary">{overview.proposalMinor > 0 ? it.budget.none.body(money(overview.proposalMinor)) : it.budget.none.bodyEmpty}</AppText>
          <Button label={it.budget.none.action} onPress={() => router.push({ pathname: '/budget-edit', params: { scope: 'global' } })} style={{ alignSelf: 'flex-start' }} />
        </View>
      )}

      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: spacing.md }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.budget.byCategory}
          </AppText>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`${it.budget.add}: ${it.budget.editor.category}`}
            feedback="dim"
            onPress={() => router.push({ pathname: '/budget-edit', params: { scope: 'category' } })}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: spacing.md }}
          >
            <Icon name="Plus" size={16} color={colors.ink} weight="bold" />
            <AppText variant="subheadStrong">{it.budget.add}</AppText>
          </PressableScale>
        </View>
        {overview.categories.length === 0 ? (
          <AppText variant="subhead" tone="secondary">
            {it.budget.noCategoryBudgets}
          </AppText>
        ) : null}
        {overview.categories.map((row) => (
          <PressableScale
            key={row.categoryId}
            accessibilityRole="button"
            accessibilityLabel={`${row.name}, ${it.budget.spentOf(money(row.spentMinor), money(row.budgetMinor))}, ${row.refundedMinor > 0 ? it.budget.refundedBeyond(money(row.refundedMinor)) : it.budget.statusWords[row.status]}`}
            feedback="dim"
            onPress={() => router.push({ pathname: '/category/[id]', params: { id: row.categoryId } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, paddingVertical: spacing.smd, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
          >
            <LineBadge color={row.color} icon={row.icon} />
            <View style={{ flex: 1, gap: spacing.xxs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm }}>
                <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                  {row.name}
                </AppText>
                <SpentOf spent={row.spentMinor} budget={row.budgetMinor} currency={currency} variant="subhead" />
              </View>
              <ProgressLine ratio={row.ratio} color={lineColor(row.color).fill} edge={lineColor(row.color).edge} pace={overview.pace} />
              {row.refundedMinor > 0 ? (
                <AppText variant="footnote" tone="secondary">
                  {it.budget.refundedBeyond(money(row.refundedMinor))}
                </AppText>
              ) : (
                <StatusLine status={row.status} />
              )}
            </View>
          </PressableScale>
        ))}
      </View>

      {overview.withoutBudget.length ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="subheadStrong" tone="secondary" accessibilityRole="header">
            {it.budget.withoutBudget}
          </AppText>
          {overview.withoutBudget.map((c) => (
            <PressableScale
              key={c.categoryId}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, ${money(c.spentMinor)}. ${it.budget.addBudget}`}
              feedback="dim"
              onPress={() => router.push({ pathname: '/category/[id]', params: { id: c.categoryId } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 52 }}
            >
              <LineBadge color={c.color} icon={c.icon} />
              <AppText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                {c.name}
              </AppText>
              <Money minor={c.spentMinor} currency={currency} variant="subhead" tone="secondary" wholeUnits />
              <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
            </PressableScale>
          ))}
        </View>
      ) : null}
    </View>
  );
}
