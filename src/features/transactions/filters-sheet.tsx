import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { LineBadge } from '@/components/line-badge';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { it } from '@/i18n/it';
import { haptics } from '@/services/haptics';
import { useTransactionFilters } from '@/state/transaction-filters';
import { layout, spacing, useTheme } from '@/theme';

import { DEFAULT_FILTERS, type PeriodFilter, type SortOrder } from './list';
import { useVisibleTransactions } from './use-visible-transactions';

const SORTS: SortOrder[] = ['date-desc', 'date-asc', 'amount-desc', 'amount-asc'];
const PERIODS: PeriodFilter[] = ['all', 'month', 'last-month', '3-months'];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="subheadStrong" tone="secondary" accessibilityRole="header">
        {title}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{children}</View>
    </View>
  );
}

/** Sort, period, categories and accounts. The list behind updates as you choose. */
export function FiltersSheet() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, results, filters } = useVisibleTransactions();
  const { setSort, setPeriod, toggleCategory, toggleAccount, resetSheet } = useTransactionFilters();
  const pick = (fn: () => void) => () => {
    haptics.selection();
    fn();
  };

  const categories = (data?.categories ?? [])
    .filter((c) => !c.archived && !c.parentId)
    .sort((a, b) => (a.kind === b.kind ? a.sortOrder - b.sortOrder : a.kind === 'expense' ? -1 : 1));
  const accounts = (data?.accounts ?? []).filter((a) => !a.archived).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader
        title={it.filters.title}
        left={{ label: it.detail.close, onPress: () => router.back() }}
        right={{ label: it.filters.reset, onPress: pick(resetSheet) }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingVertical: spacing.md, gap: spacing.lg }}>
        <Group title={it.filters.sort}>
          {SORTS.map((sort) => (
            <Chip key={sort} label={it.filters.sorts[sort]} selected={filters.sort === sort} onPress={pick(() => setSort(sort))} />
          ))}
        </Group>
        <Group title={it.filters.period}>
          {filters.range ? <Chip label={filters.range.label} selected onPress={pick(() => setPeriod(DEFAULT_FILTERS.period))} /> : null}
          {PERIODS.map((period) => (
            <Chip
              key={period}
              label={it.filters.periods[period]}
              selected={!filters.range && filters.period === period}
              onPress={pick(() => setPeriod(period))}
            />
          ))}
        </Group>
        <Group title={it.filters.categories}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={filters.categoryIds.includes(c.id)}
              onPress={pick(() => toggleCategory(c.id))}
              leading={<LineBadge color={c.color} icon={c.icon} size={28} />}
            />
          ))}
        </Group>
        <Group title={it.filters.accounts}>
          {accounts.map((a) => (
            <Chip key={a.id} label={a.name} selected={filters.accountIds.includes(a.id)} onPress={pick(() => toggleAccount(a.id))} />
          ))}
        </Group>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        <Button label={it.filters.show(results.length)} onPress={() => router.back()} />
      </View>
      <ToastHost bottom={88} />
    </View>
  );
}
