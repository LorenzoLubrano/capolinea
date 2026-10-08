import type { Snapshot } from '@/data/repositories';
import {
  dayHabits,
  firstMovementDate,
  isVariable,
  largestExpenses,
  merchantKey,
  periodAt,
  spendingByMerchant,
  spendingSeries,
  typicalSpending,
  usualLevel,
  type Bucket,
  type DayHabits,
  type MerchantSpending,
  type Period,
  type PeriodUnit,
} from '@/domain/analysis';
import { spendingByCategory, subscriptionTotals } from '@/domain/breakdown';
import { budgetHistory, forecastMonthEnd, type BudgetMonth } from '@/domain/budget';
import { isWithin } from '@/domain/dates';
import { spendingBetween } from '@/domain/spending';
import type { Id, LocalDate, Transaction } from '@/domain/types';
import { upcomingRecurring } from '@/features/budget/overview';
import { it } from '@/i18n/it';

/** Previous periods behind "the usual": four weeks, three months, one year. */
const USUAL_PERIODS: Record<PeriodUnit, number> = { week: 4, month: 3, year: 1 };
const TREND_PERIODS = 6;
const BUDGET_MONTHS = 6;
const LARGEST = 5;
/** Two of each weekday before naming the dearest one. */
const HABIT_MIN_DAYS = 14;

export interface TrendChart {
  buckets: Bucket[];
  /** 'last': the analysed period is the last bar. 'all': every bar is a month of the analysed year. */
  emphasis: 'last' | 'all';
  /** The bar described when the chart first shows. */
  selectedIndex: number;
  /** The usual bar: median of the complete bars before the analysed one (of the year's complete months in the year view). */
  usualMinor: number | null;
  /** Month-end forecast on the bar that contains today. */
  forecast: { index: number; amountMinor: number } | null;
}

export interface Comparison {
  usualMinor: number;
  /** Relative change: 0.12 is 12% more than usual. */
  change: number;
}

export interface CategoryShare {
  categoryId: Id | null;
  name: string;
  color: string;
  icon?: string;
  spentMinor: number;
  share: number;
}

export interface Analysis {
  period: Period;
  /** The period contains today. */
  current: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  totalMinor: number;
  comparison: Comparison | null;
  trend: TrendChart;
  categories: CategoryShare[];
  days: {
    /** One bucket per day of the period, variable spending only. */
    buckets: Bucket[];
    firstMovement: LocalDate | null;
    habits: DayHabits;
    /** Dearest weekday on average, once there are enough days to say. */
    busiestWeekday: { weekday: number; averageMinor: number } | null;
    /** The single dearest day. */
    peak: Bucket | null;
  };
  merchants: MerchantSpending[];
  largest: { tx: Transaction; amountMinor: number }[];
  subscriptions: { monthlyMinor: number; yearlyMinor: number; activeCount: number; periodMinor: number; share: number | null };
  budgets: BudgetMonth[];
}

interface Context {
  snapshot: Snapshot;
  period: Period;
  /** Last day that counts: the period end, or today. */
  until: LocalDate;
  first: LocalDate | null;
  options: { currency: string; meId: Id };
}

function context(snapshot: Snapshot, unit: PeriodUnit, offset: number): Context {
  const period = periodAt(unit, snapshot.today, offset);
  return {
    snapshot,
    period,
    until: period.to < snapshot.today ? period.to : snapshot.today,
    first: firstMovementDate(snapshot.transactions),
    options: { currency: snapshot.currency, meId: snapshot.meId },
  };
}

function compare(totalMinor: number, usualMinor: number | null): Comparison | null {
  if (!usualMinor || usualMinor <= 0) return null;
  return { usualMinor, change: (totalMinor - usualMinor) / usualMinor };
}

/**
 * Up to six weeks or months ending with the period (none before the data starts), or the twelve months of the year.
 * `forecastFor` gives the month-end forecast when a month bar contains today.
 */
function trendChart(ctx: Context, txs: Transaction[], forecastFor: (() => number) | null): TrendChart {
  const { period, snapshot, first, options } = ctx;
  if (period.unit === 'year') {
    const buckets = spendingSeries(txs, period, 'month', snapshot.today, options);
    const todayIndex = buckets.findIndex((b) => isWithin(snapshot.today, b.from, b.to));
    return {
      buckets,
      emphasis: 'all',
      selectedIndex: todayIndex >= 0 ? todayIndex : buckets.length - 1,
      usualMinor: usualLevel(buckets, first),
      forecast: todayIndex >= 0 && forecastFor ? { index: todayIndex, amountMinor: forecastFor() } : null,
    };
  }
  const range = { from: periodAt(period.unit, period.from, 1 - TREND_PERIODS).from, to: period.to };
  // Periods before the first movement have no data, which is not the same as spending nothing.
  const all = spendingSeries(txs, range, period.unit, snapshot.today, options);
  const buckets = all.filter((b, i) => i === all.length - 1 || (first !== null && b.to >= first));
  const last = buckets.length - 1;
  const current = isWithin(snapshot.today, buckets[last].from, buckets[last].to);
  return {
    buckets,
    emphasis: 'last',
    selectedIndex: last,
    usualMinor: usualLevel(buckets.slice(0, last), first),
    forecast: current && period.unit === 'month' && forecastFor ? { index: last, amountMinor: forecastFor() } : null,
  };
}

function monthForecast(snapshot: Snapshot, categoryId?: Id): () => number {
  return () =>
    forecastMonthEnd(snapshot.transactions, snapshot.today, {
      currency: snapshot.currency,
      meId: snapshot.meId,
      upcomingRecurringMinor: upcomingRecurring(snapshot, categoryId),
      categoryId,
    });
}

function canGoBack({ period, first }: Context): boolean {
  return first !== null && periodAt(period.unit, period.from, -1).to >= first;
}

/** Everything the Analisi tab shows for one week, month or year; `offset` counts periods back from the current one. */
export function buildAnalysis(snapshot: Snapshot, unit: PeriodUnit, offset: number): Analysis {
  const ctx = context(snapshot, unit, offset);
  const { period, until, first, options } = ctx;
  const { transactions, today, categories, subscriptions, budgets } = snapshot;
  const totalMinor = spendingBetween(transactions, period.from, until, options);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const dayBuckets = spendingSeries(transactions.filter(isVariable), period, 'day', today, options);
  const habits = dayHabits(dayBuckets, first);
  const dearest = habits.weekdayAverages.reduce<{ weekday: number; averageMinor: number } | null>(
    (best, average, weekday) => (average !== null && average > 0 && (!best || average > best.averageMinor) ? { weekday, averageMinor: average } : best),
    null,
  );
  const peak = dayBuckets.reduce<Bucket | null>((best, day) => (day.spentMinor > 0 && (!best || day.spentMinor > best.spentMinor) ? day : best), null);

  const totals = subscriptionTotals(subscriptions, snapshot.currency);
  const subscriptionMinor = spendingBetween(transactions.filter((t) => t.subscriptionId), period.from, until, options);

  return {
    period,
    current: isWithin(today, period.from, period.to),
    canGoBack: canGoBack(ctx),
    canGoForward: offset < 0,
    totalMinor,
    comparison: compare(totalMinor, typicalSpending(transactions, period, today, USUAL_PERIODS[unit], options)),
    trend: trendChart(ctx, transactions, monthForecast(snapshot)),
    categories: spendingByCategory(transactions, period.from, until, options).map(({ categoryId, amountMinor }) => {
      const category = categoryId ? categoryById.get(categoryId) : undefined;
      return {
        categoryId,
        name: category?.name ?? it.analytics.uncategorized,
        color: category?.color ?? 'grey',
        icon: category?.icon,
        spentMinor: amountMinor,
        share: totalMinor > 0 ? amountMinor / totalMinor : 0,
      };
    }),
    days: { buckets: dayBuckets, firstMovement: first, habits, busiestWeekday: habits.pastDays >= HABIT_MIN_DAYS ? dearest : null, peak },
    merchants: spendingByMerchant(transactions, period.from, until, options),
    largest: largestExpenses(transactions.filter(isVariable), period.from, until, options, LARGEST),
    subscriptions: { ...totals, periodMinor: subscriptionMinor, share: totalMinor > 0 ? subscriptionMinor / totalMinor : null },
    budgets: budgetHistory({ budgets, transactions, until: period.to, today, months: BUDGET_MONTHS, ...options }),
  };
}

function byNewest(a: Transaction, b: Transaction): number {
  return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
}

export interface CategoryAnalysis {
  period: Period;
  totalMinor: number;
  /** Share of all the spending of the period. */
  share: number | null;
  comparison: Comparison | null;
  trend: TrendChart;
  merchants: MerchantSpending[];
  movements: Transaction[];
}

/** One category over the analysed period: total, share, trend, where the money goes, movements. */
export function buildCategoryAnalysis(snapshot: Snapshot, unit: PeriodUnit, offset: number, categoryId: Id): CategoryAnalysis {
  const ctx = context(snapshot, unit, offset);
  const { period, until, options } = ctx;
  const inCategory = snapshot.transactions.filter((t) => t.categoryId === categoryId);
  const totalMinor = spendingBetween(inCategory, period.from, until, options);
  const allMinor = spendingBetween(snapshot.transactions, period.from, until, options);
  return {
    period,
    totalMinor,
    share: allMinor > 0 ? totalMinor / allMinor : null,
    comparison: compare(totalMinor, typicalSpending(inCategory, period, snapshot.today, USUAL_PERIODS[unit], options)),
    trend: trendChart({ ...ctx, first: firstMovementDate(inCategory) }, inCategory, monthForecast(snapshot, categoryId)),
    merchants: spendingByMerchant(inCategory, period.from, until, options),
    movements: inCategory.filter((t) => !t.deletedAt && isWithin(t.date, period.from, until)).sort(byNewest),
  };
}

export interface MerchantAnalysis {
  period: Period;
  name: string;
  categoryId?: Id;
  totalMinor: number;
  count: number;
  averageMinor: number | null;
  allTime: { spentMinor: number; count: number; since: LocalDate | null };
  trend: TrendChart;
  movements: Transaction[];
}

/** One merchant over the analysed period, and since the first purchase there. */
export function buildMerchantAnalysis(snapshot: Snapshot, unit: PeriodUnit, offset: number, name: string): MerchantAnalysis {
  const ctx = context(snapshot, unit, offset);
  const { period, until, options } = ctx;
  const key = merchantKey(name);
  const atMerchant = snapshot.transactions.filter((t) => !t.deletedAt && t.merchant && merchantKey(t.merchant) === key);
  const first = firstMovementDate(atMerchant);
  const [inPeriod] = spendingByMerchant(atMerchant, period.from, until, options);
  const [allTime] = first ? spendingByMerchant(atMerchant, first, snapshot.today, options) : [];
  const totalMinor = spendingBetween(atMerchant, period.from, until, options);
  const count = inPeriod?.count ?? 0;
  return {
    period,
    name: allTime?.name ?? name,
    categoryId: allTime?.categoryId,
    totalMinor,
    count,
    averageMinor: count ? Math.round(totalMinor / count) : null,
    allTime: { spentMinor: allTime?.spentMinor ?? 0, count: allTime?.count ?? 0, since: first },
    trend: trendChart({ ...ctx, first }, atMerchant, null),
    movements: atMerchant.filter((t) => isWithin(t.date, period.from, until)).sort(byNewest),
  };
}
