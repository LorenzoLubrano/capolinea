import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { SheetHeader } from '@/components/sheet-header';
import { StopRow } from '@/components/stop-row';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useSnapshot } from '@/data/queries';
import type { Snapshot } from '@/data/repositories';
import type { Transaction } from '@/domain/types';
import { describeTransaction } from '@/features/transactions/describe';
import { it } from '@/i18n/it';
import { dayLabel, fullDate, periodLabel } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { formatShare } from '@/services/format/numbers';
import { useAnalysisPeriod } from '@/state/analysis-period';
import { useSettings } from '@/state/settings';
import { layout, spacing, useTheme } from '@/theme';

import { buildCategoryAnalysis, buildMerchantAnalysis } from './analysis';
import { ComparisonLine, MerchantRow } from './parts';
import { TrendChartView } from './trend-chart';

/** A detail sheet: header with Chiudi, scrolling body, optional footer button. */
function DetailSheet({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={title} left={{ label: it.budget.detail.close, onPress: () => router.back() }} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: footer ? spacing.xl : insets.bottom + spacing.xl, gap: spacing.xl }}
      >
        {children}
      </ScrollView>
      {footer ? (
        <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline }}>{footer}</View>
      ) : null}
      <ToastHost bottom={footer ? 88 : 24} />
    </View>
  );
}

function Movements({ title, empty, movements, data }: { title: string; empty: string; movements: Transaction[]; data: Snapshot }) {
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const accounts = new Map(data.accounts.map((a) => [a.id, a.name]));
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="title3" accessibilityRole="header">
        {title}
      </AppText>
      {movements.length === 0 ? (
        <AppText variant="subhead" tone="secondary">
          {empty}
        </AppText>
      ) : (
        movements.map((tx, i) => (
          <StopRow
            key={tx.id}
            tx={tx}
            category={tx.categoryId ? categories.get(tx.categoryId) : undefined}
            subtitle={`${dayLabel(tx.date, data.today)} · ${describeTransaction(tx, { accountName: accounts.get(tx.accountId) })}`}
            currency={data.currency}
            meId={data.meId}
            first={i === 0}
            last={i === movements.length - 1}
            onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
          />
        ))
      )}
    </View>
  );
}

/** Analisi › a category over the analysed period: total, share, trend, where, movements. */
export function CategoryAnalysisSheet() {
  const { lineColor } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { unit, offset } = useAnalysisPeriod();
  const { data } = useSnapshot();
  if (!data) return <View style={{ flex: 1 }} />;

  const category = data.categories.find((c) => c.id === id);
  const analysis = buildCategoryAnalysis(data, unit, offset, id);
  const current = analysis.period.from <= data.today && data.today <= analysis.period.to;
  const categories = new Map(data.categories.map((c) => [c.id, c]));

  return (
    <DetailSheet
      title={category?.name ?? ''}
      footer={<Button label={it.analytics.category.budget} variant="secondary" onPress={() => router.push({ pathname: '/category/[id]', params: { id } })} />}
    >
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <LineBadge color={category?.color ?? 'grey'} name={category?.name ?? ''} size={28} />
          <AppText variant="callout" tone="secondary">
            {periodLabel(analysis.period)}
          </AppText>
        </View>
        <Money minor={analysis.totalMinor} currency={data.currency} variant="display" centsVariant="displayCents" label={category?.name} />
        {analysis.share !== null ? (
          <AppText variant="subhead" tone="secondary">
            {it.analytics.category.share(formatShare(analysis.share))}
          </AppText>
        ) : null}
        <ComparisonLine comparison={analysis.comparison} current={current} unit={unit} currency={data.currency} />
      </View>
      <TrendChartView trend={analysis.trend} unit={unit} color={lineColor(category?.color ?? 'grey').fill} currency={data.currency} />
      {analysis.merchants.length ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.analytics.category.merchants}
          </AppText>
          <View>
            {analysis.merchants.map((m) => (
              <MerchantRow
                key={m.key}
                merchant={m}
                category={m.categoryId ? categories.get(m.categoryId) : undefined}
                currency={data.currency}
                showCategory={false}
                onPress={() => router.push({ pathname: '/analysis/merchant/[name]', params: { name: m.name } })}
              />
            ))}
          </View>
        </View>
      ) : null}
      <Movements title={it.analytics.category.movements} empty={it.analytics.category.noMovements} movements={analysis.movements} data={data} />
    </DetailSheet>
  );
}

/** Analisi › a merchant over the analysed period, and since the first purchase there. */
export function MerchantAnalysisSheet() {
  const { lineColor } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const { name } = useLocalSearchParams<{ name: string }>();
  const { unit, offset } = useAnalysisPeriod();
  const { data } = useSnapshot();
  if (!data) return <View style={{ flex: 1 }} />;

  const analysis = buildMerchantAnalysis(data, unit, offset, name);
  const category = data.categories.find((c) => c.id === analysis.categoryId);
  const money = (minor: number) => formatMoney(minor, data.currency, { masked, wholeUnits: true });
  const purchases = it.analytics.merchants.purchases(analysis.count);
  const color = lineColor(category?.color ?? 'grey').fill;

  return (
    <DetailSheet title={analysis.name}>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: color }} />
          <AppText variant="callout" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
            {[category?.name, periodLabel(analysis.period)].filter(Boolean).join(' · ')}
          </AppText>
        </View>
        <Money minor={analysis.totalMinor} currency={data.currency} variant="display" centsVariant="displayCents" label={analysis.name} />
        <AppText variant="subhead" tone="secondary">
          {analysis.averageMinor !== null ? `${purchases} · ${it.analytics.merchant.average(money(analysis.averageMinor))}` : purchases}
        </AppText>
        {analysis.allTime.since ? (
          <AppText variant="subhead" tone="secondary">
            {`${it.analytics.merchant.allTime(money(analysis.allTime.spentMinor), it.analytics.merchants.purchases(analysis.allTime.count))} ${it.analytics.merchant.firstPurchase(fullDate(analysis.allTime.since).replace(/^\S+ /, ''))}`}
          </AppText>
        ) : null}
      </View>
      <TrendChartView trend={analysis.trend} unit={unit} color={color} currency={data.currency} />
      <Movements title={it.analytics.merchant.movements} empty={it.analytics.merchant.noMovements} movements={analysis.movements} data={data} />
    </DetailSheet>
  );
}
