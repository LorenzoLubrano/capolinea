import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { LoadError, LoadingBlocks } from '@/components/load-state';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { ProgressLine } from '@/components/progress-line';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { StopRow } from '@/components/stop-row';
import { AppText } from '@/components/text';
import { useSnapshot } from '@/data/queries';
import type { Snapshot } from '@/data/repositories';
import type { Period, PeriodUnit } from '@/domain/analysis';
import { it } from '@/i18n/it';
import { useAnnounce } from '@/services/a11y';
import { dayLabel, monthName, periodLabel, weekdayName } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { formatShare } from '@/services/format/numbers';
import { useAnalysisPeriod } from '@/state/analysis-period';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

import { buildAnalysis, type Analysis } from './analysis';
import { DayDots } from './day-dots';
import { AnalysisSection, ComparisonLine, LinkRow, MerchantRow, ShowMore } from './parts';
import { TrendChartView } from './trend-chart';

const UNITS: PeriodUnit[] = ['week', 'month', 'year'];
const SHORT_LIST = 5;
const SHORT_CATEGORIES = 6;

/** The analysed period with arrows to the one before and after; the future is out of reach. */
function PeriodStepper({ period, current, canGoBack, canGoForward, onStep }: { period: Period; current: boolean; canGoBack: boolean; canGoForward: boolean; onStep: (delta: number) => void }) {
  const { colors } = useTheme();
  const arrow = (delta: -1 | 1, enabled: boolean) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={delta < 0 ? it.analytics.previous : it.analytics.next}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={() => onStep(delta)}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={delta < 0 ? 'CaretLeft' : 'CaretRight'} size={20} weight="bold" color={enabled ? colors.ink : colors.hairline} />
    </PressableScale>
  );
  useAnnounce(periodLabel(period), { skipInitial: true });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: -spacing.smd }}>
      {arrow(-1, canGoBack)}
      <View style={{ flex: 1, alignItems: 'center' }} accessible accessibilityLiveRegion="polite">
        <AppText variant="title3" numberOfLines={1}>
          {periodLabel(period)}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {current ? it.analytics.current[period.unit] : ' '}
        </AppText>
      </View>
      {arrow(1, canGoForward)}
    </View>
  );
}

function UsualSection({ analysis, data }: { analysis: Analysis; data: Snapshot }) {
  const { colors } = useTheme();
  return (
    <AnalysisSection question={it.analytics.usual.question} ruled={false}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="subhead" tone="secondary">
          {analysis.current ? it.analytics.usual.spentSoFar : it.analytics.usual.spent}
        </AppText>
        <Money minor={analysis.totalMinor} currency={data.currency} variant="display" centsVariant="displayCents" label={it.analytics.usual.spent} />
        <ComparisonLine comparison={analysis.comparison} current={analysis.current} unit={analysis.period.unit} currency={data.currency} />
      </View>
      {/* Without any spending yet the chart would only draw empty bars. */}
      {analysis.trend.buckets.some((b) => b.spentMinor > 0) ? (
        <TrendChartView key={`${analysis.period.unit}-${analysis.period.from}`} trend={analysis.trend} unit={analysis.period.unit} color={colors.ink} currency={data.currency} />
      ) : null}
    </AnalysisSection>
  );
}

function CategoriesSection({ analysis, data }: { analysis: Analysis; data: Snapshot }) {
  const { lineColor } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const [expanded, setExpanded] = useState(false);
  const { categories } = analysis;
  const top = categories[0];
  const max = top?.spentMinor ?? 1;
  const shown = expanded ? categories : categories.slice(0, SHORT_CATEGORIES);
  return (
    <AnalysisSection question={it.analytics.categories.question} answer={top ? it.analytics.categories.answer(top.name, formatShare(top.share)) : null}>
      <View>
        {shown.map((c) => (
          <PressableScale
            key={c.categoryId ?? 'none'}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${formatMoney(c.spentMinor, data.currency, { masked })}, ${formatShare(c.share)}`}
            feedback="dim"
            disabled={!c.categoryId}
            onPress={() => c.categoryId && router.push({ pathname: '/analysis/category/[id]', params: { id: c.categoryId } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, paddingVertical: spacing.sm }}
          >
            <LineBadge color={c.color} name={c.name} />
            <View style={{ flex: 1, gap: spacing.xxs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
                <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {c.name}
                </AppText>
                <AppText variant="footnote" tone="tertiary">
                  {formatShare(c.share)}
                </AppText>
                <Money minor={c.spentMinor} currency={data.currency} variant="subheadStrong" wholeUnits />
              </View>
              <ProgressLine ratio={c.spentMinor / max} color={lineColor(c.color).fill} />
            </View>
          </PressableScale>
        ))}
      </View>
      {categories.length > SHORT_CATEGORIES ? (
        <ShowMore expanded={expanded} total={categories.length} label={it.analytics.showAllCategories} onPress={() => setExpanded((e) => !e)} />
      ) : null}
    </AnalysisSection>
  );
}

function DaysSection({ analysis, data }: { analysis: Analysis; data: Snapshot }) {
  const masked = useSettings((s) => s.privacy);
  const money = (minor: number) => formatMoney(minor, data.currency, { masked, wholeUnits: true });
  const { busiestWeekday, peak, habits } = analysis.days;
  const sentences = [
    busiestWeekday
      ? it.analytics.days.busiest(it.analytics.days.weekday(busiestWeekday.weekday, weekdayName(busiestWeekday.weekday)), money(busiestWeekday.averageMinor))
      : peak
        ? it.analytics.days.peak(dayLabel(peak.from, data.today).toLowerCase(), money(peak.spentMinor))
        : null,
    habits.pastDays ? it.analytics.days.zeroDays(habits.zeroDays) : null,
  ].filter(Boolean);
  const answer = sentences.join(' ');
  return (
    <AnalysisSection question={it.analytics.days.question} answer={answer}>
      <DayDots key={analysis.period.from + analysis.period.unit} buckets={analysis.days.buckets} period={analysis.period} today={data.today} firstMovement={analysis.days.firstMovement} currency={data.currency} summary={answer} />
      <AppText variant="footnote" tone="tertiary">
        {it.analytics.days.note}
      </AppText>
    </AnalysisSection>
  );
}

function MerchantsSection({ analysis, data }: { analysis: Analysis; data: Snapshot }) {
  const [expanded, setExpanded] = useState(false);
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const { merchants } = analysis;
  if (!merchants.length) return null;
  const shown = expanded ? merchants : merchants.slice(0, SHORT_LIST);
  return (
    <AnalysisSection question={it.analytics.merchants.question}>
      <View>
        {shown.map((m) => (
          <MerchantRow
            key={m.key}
            merchant={m}
            category={m.categoryId ? categories.get(m.categoryId) : undefined}
            currency={data.currency}
            onPress={() => router.push({ pathname: '/analysis/merchant/[name]', params: { name: m.name } })}
          />
        ))}
      </View>
      {merchants.length > SHORT_LIST ? <ShowMore expanded={expanded} total={merchants.length} label={it.analytics.showAll} onPress={() => setExpanded((e) => !e)} /> : null}
    </AnalysisSection>
  );
}

function LargestSection({ analysis, data }: { analysis: Analysis; data: Snapshot }) {
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  if (!analysis.largest.length) return null;
  return (
    <AnalysisSection question={it.analytics.largest.question} answer={it.analytics.largest.note}>
      <View>
        {analysis.largest.map(({ tx }, i) => {
          const category = tx.categoryId ? categories.get(tx.categoryId) : undefined;
          return (
            <StopRow
              key={tx.id}
              tx={tx}
              category={category}
              subtitle={[dayLabel(tx.date, data.today), category?.name].filter(Boolean).join(' · ')}
              currency={data.currency}
              meId={data.meId}
              first={i === 0}
              last={i === analysis.largest.length - 1}
              onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
            />
          );
        })}
      </View>
    </AnalysisSection>
  );
}

function SubscriptionsSection({ analysis, data }: { analysis: Analysis; data: Snapshot }) {
  const masked = useSettings((s) => s.privacy);
  const { subscriptions } = analysis;
  const open = () => router.navigate({ pathname: '/budget', params: { section: 'subscriptions', at: String(Date.now()) } });
  return (
    <AnalysisSection question={it.analytics.subscriptions.question}>
      {subscriptions.activeCount === 0 ? (
        <AppText variant="subhead" tone="secondary">
          {it.analytics.subscriptions.none}
        </AppText>
      ) : (
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
            <Money minor={subscriptions.monthlyMinor} currency={data.currency} variant="figure" />
            <AppText variant="callout" tone="secondary">
              {it.analytics.subscriptions.perMonth}
            </AppText>
          </View>
          {subscriptions.share !== null ? (
            <AppText variant="subhead" tone="secondary">
              {it.analytics.subscriptions.share(formatMoney(subscriptions.periodMinor, data.currency, { masked, wholeUnits: true }), formatShare(subscriptions.share))}
            </AppText>
          ) : null}
          <AppText variant="subhead" tone="secondary">
            {it.analytics.subscriptions.perYear(formatMoney(subscriptions.yearlyMinor, data.currency, { masked, wholeUnits: true }), subscriptions.activeCount)}
          </AppText>
        </View>
      )}
      <LinkRow label={it.analytics.subscriptions.open} onPress={open} />
    </AnalysisSection>
  );
}

function BudgetsSection({ analysis, data }: { analysis: Analysis; data: Snapshot }) {
  const { colors } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const money = (minor: number) => formatMoney(minor, data.currency, { masked, wholeUnits: true });
  const months = analysis.budgets;
  const closed = months.filter((m) => m.outcome === 'kept' || m.outcome === 'over');
  const kept = closed.filter((m) => m.outcome === 'kept').length;
  if (!months.length) return null;
  return (
    <AnalysisSection question={it.analytics.budgets.question} answer={closed.length ? it.analytics.budgets.summary(kept, closed.length) : null}>
      <View>
        {months.map((m) => {
          const name = monthName(m.month);
          const outcome =
            m.outcome === 'kept'
              ? it.analytics.budgets.kept
              : m.outcome === 'over'
                ? it.analytics.budgets.over(money(m.spentMinor - (m.budgetMinor ?? 0)))
                : m.outcome === 'running'
                  ? it.analytics.budgets.running
                  : it.analytics.budgets.none;
          const spentOf = m.budgetMinor !== null ? it.budget.spentOf(money(m.spentMinor), money(m.budgetMinor)) : money(m.spentMinor);
          return (
            <View
              key={m.month}
              accessible
              accessibilityLabel={`${name}, ${spentOf}, ${outcome}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
            >
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <AppText variant="bodyStrong">{name.charAt(0).toUpperCase() + name.slice(1)}</AppText>
                <AppText variant="footnote" tone="secondary">
                  {spentOf}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                {m.outcome === 'kept' || m.outcome === 'over' ? (
                  <Icon name={m.outcome === 'over' ? 'Warning' : 'Check'} size={14} weight="bold" color={m.outcome === 'over' ? colors.alert : colors.inkSecondary} />
                ) : null}
                <AppText variant="footnote" tone={m.outcome === 'over' ? 'alert' : m.outcome === 'none' ? 'tertiary' : 'secondary'}>
                  {outcome}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
      <LinkRow label={it.analytics.budgets.open} onPress={() => router.navigate({ pathname: '/budget', params: { section: 'month', at: String(Date.now()) } })} />
    </AnalysisSection>
  );
}

/** Analisi: one question per section for the chosen week, month or year. Three charts at most; the rest are lists. */
export function AnalyticsScreen() {
  const { unit, offset, setUnit, step } = useAnalysisPeriod();
  const { data, isPending, isError, refetch } = useSnapshot();
  const analysis = data ? buildAnalysis(data, unit, offset) : null;

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <AppText variant="title1" accessibilityRole="header">
          {it.analytics.title}
        </AppText>
        <Segmented label={it.analytics.unitsLabel} value={unit} onChange={setUnit} options={UNITS.map((value) => ({ value, label: it.analytics.units[value] }))} />
        {isPending ? (
          <LoadingBlocks heights={[44, 160, 120, 44, 44]} />
        ) : isError || !data || !analysis ? (
          <LoadError onRetry={() => refetch()} />
        ) : (
          <View style={{ gap: spacing.xl }}>
            <PeriodStepper period={analysis.period} current={analysis.current} canGoBack={analysis.canGoBack} canGoForward={analysis.canGoForward} onStep={step} />
            <UsualSection analysis={analysis} data={data} />
            {analysis.totalMinor > 0 ? (
              <>
                <CategoriesSection analysis={analysis} data={data} />
                <DaysSection analysis={analysis} data={data} />
                <MerchantsSection analysis={analysis} data={data} />
                <LargestSection analysis={analysis} data={data} />
                <SubscriptionsSection analysis={analysis} data={data} />
                <BudgetsSection analysis={analysis} data={data} />
              </>
            ) : (
              <View style={{ gap: spacing.xs }}>
                <AppText variant="title3">{it.analytics.empty.title}</AppText>
                <AppText tone="secondary">{it.analytics.empty.body}</AppText>
              </View>
            )}
          </View>
        )}
      </View>
    </Screen>
  );
}
