import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { ProgressLine } from '@/components/progress-line';
import { SheetHeader } from '@/components/sheet-header';
import { StopRow } from '@/components/stop-row';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useSnapshot } from '@/data/queries';
import { describeTransaction } from '@/features/transactions/describe';
import { it } from '@/i18n/it';
import { dayLabel, monthName } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { layout, radius, spacing, useTheme } from '@/theme';

import { StatusLine } from './month-section';
import { buildCategoryDetail } from './overview';

const BAR_HEIGHT = 72;

/** One category's month: budget line, six months of history, this month's movements. */
export function CategoryBudgetDetail() {
  const { colors, lineColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { id: categoryId } = useLocalSearchParams<{ id: string }>();
  const { data } = useSnapshot();
  const masked = useSettings((s) => s.privacy);
  if (!data) return <View style={{ flex: 1 }} />;

  const category = data.categories.find((c) => c.id === categoryId);
  const detail = buildCategoryDetail(data, categoryId);
  const fill = lineColor(category?.color ?? 'grey').fill;
  const money = (minor: number) => formatMoney(minor, data.currency, { masked, wholeUnits: true });
  const scale = Math.max(...detail.history.map((h) => h.spentMinor), detail.budgetMinor ?? 0, 1);
  const accounts = new Map(data.accounts.map((a) => [a.id, a.name]));
  const historySummary = detail.history.map((h) => `${monthName(h.month)} ${money(h.spentMinor)}`).join(', ');

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={category?.name ?? ''} left={{ label: it.budget.detail.close, onPress: () => router.back() }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <LineBadge color={category?.color ?? 'grey'} name={category?.name ?? ''} size={28} />
            <AppText variant="callout" tone="secondary">
              {monthName(data.today)}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flexWrap: 'wrap' }}>
            <Money minor={detail.spentMinor} currency={data.currency} variant="display" centsVariant="displayCents" label={category?.name} />
            {detail.budgetMinor !== null ? (
              <>
                <AppText variant="callout" tone="secondary">
                  {it.budget.of}
                </AppText>
                <Money minor={detail.budgetMinor} currency={data.currency} variant="callout" tone="secondary" wholeUnits />
              </>
            ) : null}
          </View>
          {detail.budgetMinor !== null && detail.status ? (
            <>
              <ProgressLine ratio={detail.spentMinor / detail.budgetMinor} color={fill} pace={detail.pace} height={8} />
              <StatusLine status={detail.status} />
              <AppText variant="subhead" tone="secondary">
                {detail.budgetMinor - detail.spentMinor >= 0
                  ? `${it.budget.remaining} ${money(detail.budgetMinor - detail.spentMinor)} · ${it.budget.perDay(money(detail.perDayMinor ?? 0))}`
                  : `${it.budget.over} ${money(detail.spentMinor - detail.budgetMinor)}`}
              </AppText>
            </>
          ) : (
            <AppText variant="subhead" tone="secondary">
              {it.budget.detail.noBudget}
            </AppText>
          )}
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <AppText variant="subhead" tone="secondary">
              {it.budget.forecast}
            </AppText>
            <Money minor={detail.forecastMinor} currency={data.currency} variant="subheadStrong" wholeUnits />
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.budget.detail.history}
          </AppText>
          <View accessible accessibilityLabel={it.budget.detail.historyLabel(historySummary)} style={{ gap: spacing.xs }}>
            <View style={{ height: BAR_HEIGHT, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
              {detail.history.map((h, i) => (
                <View
                  key={h.month}
                  style={{
                    flex: 1,
                    height: Math.max((h.spentMinor / scale) * BAR_HEIGHT, 2),
                    borderRadius: radius.badge,
                    backgroundColor: i === detail.history.length - 1 ? fill : colors.track,
                  }}
                />
              ))}
              {detail.budgetMinor !== null ? (
                // Dashed by segments: Android draws no dashed border on a single side.
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: (detail.budgetMinor / scale) * BAR_HEIGHT,
                    height: 2,
                    flexDirection: 'row',
                    gap: 4,
                    overflow: 'hidden',
                  }}
                >
                  {Array.from({ length: 60 }, (_, i) => (
                    <View key={i} style={{ width: 6, height: 2, backgroundColor: colors.ink }} />
                  ))}
                </View>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {detail.history.map((h) => (
                <AppText key={h.month} variant="caption" tone="tertiary" style={{ flex: 1, textAlign: 'center' }}>
                  {monthName(h.month).slice(0, 3)}
                </AppText>
              ))}
            </View>
            {detail.budgetMinor !== null ? (
              <AppText variant="caption" tone="tertiary">
                {it.budget.detail.budgetLine}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={{ gap: spacing.xs }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.budget.detail.movements(monthName(data.today))}
          </AppText>
          {detail.movements.length === 0 ? (
            <AppText variant="subhead" tone="secondary">
              {it.budget.detail.noMovements}
            </AppText>
          ) : (
            detail.movements.map((tx, i) => (
              <StopRow
                key={tx.id}
                tx={tx}
                category={category}
                subtitle={`${dayLabel(tx.date, data.today)} · ${describeTransaction(tx, { accountName: accounts.get(tx.accountId) })}`}
                currency={data.currency}
                meId={data.meId}
                first={i === 0}
                last={i === detail.movements.length - 1}
                onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
              />
            ))
          )}
        </View>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        <Button
          label={detail.budgetId ? it.budget.editor.edit : it.budget.addBudget}
          variant={detail.budgetId ? 'secondary' : 'primary'}
          onPress={() => router.push({ pathname: '/budget-edit', params: detail.budgetId ? { id: detail.budgetId } : { category: categoryId } })}
        />
      </View>
      <ToastHost bottom={88} />
    </View>
  );
}
