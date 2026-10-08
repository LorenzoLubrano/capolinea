import { router } from 'expo-router';
import { ScrollView, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { SearchField } from '@/components/search-field';
import { StopRow } from '@/components/stop-row';
import { AppText } from '@/components/text';
import { spendingImpact } from '@/domain/spending';
import type { Transaction } from '@/domain/types';
import { it } from '@/i18n/it';
import { dayLabel, shortDate } from '@/services/format/dates';
import { haptics } from '@/services/haptics';
import { useTransactionFilters } from '@/state/transaction-filters';
import { layout, radius, spacing, useTheme } from '@/theme';

import { describeTransaction } from './describe';
import { activeFilterCount, groupByDay, type DaySection, type KindFilter } from './list';
import { useVisibleTransactions } from './use-visible-transactions';

const KINDS: KindFilter[] = ['all', 'expense', 'income', 'transfer'];

function Skeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md, paddingTop: spacing.md }} accessible accessibilityLabel={it.common.loading}>
      {Array.from({ length: 6 }, (_, i) => (
        <View key={i} style={{ height: 44, borderRadius: radius.sign, backgroundColor: colors.track }} />
      ))}
    </View>
  );
}

function Message({ title, body, action }: { title: string; body: string; action?: { label: string; onPress: () => void } }) {
  return (
    <View style={{ gap: spacing.sm, paddingTop: spacing.xl }}>
      <AppText variant="title3">{title}</AppText>
      <AppText tone="secondary">{body}</AppText>
      {action ? (
        <Button label={action.label} variant="secondary" onPress={action.onPress} style={{ alignSelf: 'flex-start' }} />
      ) : null}
    </View>
  );
}

/** Movimenti: every movement by day, instant search, kind chips and the filter sheet. */
export function TransactionsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isPending, isError, refetch, results, filters } = useVisibleTransactions();
  const { setQuery, setKind, resetAll } = useTransactionFilters();

  const byDate = filters.sort === 'date-desc' || filters.sort === 'date-asc';
  let sections: DaySection[] = [];
  if (data) {
    if (byDate) {
      const days = groupByDay(results, data.meId);
      sections = filters.sort === 'date-asc' ? days.reverse().map((d) => ({ ...d, data: [...d.data].reverse() })) : days;
    } else {
      sections = results.length ? [{ date: '', totalMinor: 0, data: results }] : [];
    }
  }
  // Ternaries, never `data?.categories.map` or `data!` in a callback: the React Compiler memoizes
  // on `data.categories` and the like, which crashes while the data is loading.
  const categories = new Map(data ? data.categories.map((c) => [c.id, c]) : []);
  const accounts = new Map(data ? data.accounts.map((a) => [a.id, a.name]) : []);
  const currency = data ? data.currency : '';
  const meId = data ? data.meId : '';
  const today = data ? data.today : '';
  const spent = data ? results.reduce((sum, tx) => sum + spendingImpact(tx, data.meId), 0) : 0;
  const sheetFilters = activeFilterCount(filters);
  const searching = filters.query.trim().length > 0;

  const header = (
    <View style={{ gap: spacing.smd, paddingBottom: spacing.sm }}>
      <AppText variant="title1" accessibilityRole="header">
        {it.transactions.title}
      </AppText>
      <SearchField
        value={filters.query}
        onChangeText={setQuery}
        placeholder={it.transactions.searchPlaceholder}
        label={it.transactions.searchLabel}
        clearLabel={it.transactions.clearSearch}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }} style={{ marginHorizontal: -spacing.gutter }}>
        <View style={{ width: spacing.gutter - spacing.sm }} />
        <Chip
          label={sheetFilters ? `${it.transactions.filters} · ${sheetFilters}` : it.transactions.filters}
          accessibilityLabel={sheetFilters ? it.transactions.filtersActive(sheetFilters) : it.transactions.filters}
          selected={sheetFilters > 0}
          onPress={() => router.push('/transaction-filters')}
          leading={<Icon name="SlidersHorizontal" size={16} color={sheetFilters ? colors.onInk : colors.ink} />}
        />
        {KINDS.map((kind) => (
          <Chip
            key={kind}
            label={it.transactions.kinds[kind]}
            selected={filters.kind === kind}
            onPress={() => {
              haptics.selection();
              setKind(kind);
            }}
          />
        ))}
        <View style={{ width: spacing.gutter - spacing.sm }} />
      </ScrollView>
      {data && results.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <AppText variant="footnote" tone="secondary">
            {`${it.transactions.count(results.length)} · ${it.transactions.spent}`}
          </AppText>
          <Money minor={spent} currency={data.currency} variant="footnote" tone="secondary" />
        </View>
      ) : null}
    </View>
  );

  let empty = null;
  if (isPending) empty = <Skeleton />;
  else if (isError || !data)
    empty = <Message title={it.home.error.title} body={it.home.error.body} action={{ label: it.home.error.retry, onPress: () => refetch() }} />;
  else if (data.transactions.length === 0) empty = <Message title={it.transactions.empty.title} body={it.transactions.empty.body} />;
  else
    empty = (
      <Message
        title={searching ? it.transactions.noResults.query(filters.query.trim()) : it.transactions.noResults.filters}
        body={it.transactions.noResults.body}
        action={{ label: it.transactions.noResults.reset, onPress: resetAll }}
      />
    );

  const renderItem = ({ item, index, section }: { item: Transaction; index: number; section: DaySection }) => {
    const category = item.categoryId ? categories.get(item.categoryId) : undefined;
    const subtitle = describeTransaction(item, {
      categoryName: category?.name,
      accountName: accounts.get(item.accountId),
      toAccountName: item.toAccountId ? accounts.get(item.toAccountId) : undefined,
    });
    return (
      <StopRow
        tx={item}
        category={category}
        subtitle={byDate ? subtitle : `${shortDate(item.date)} · ${subtitle}`}
        currency={currency}
        meId={meId}
        first={index === 0}
        last={index === section.data.length - 1}
        onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: item.id } })}
      />
    );
  };

  return (
    // The list starts below the status bar, so sticky day headers never slide under it.
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={({ section }) =>
          section.date ? (
            <View
              accessible
              accessibilityRole="header"
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: spacing.md,
                paddingBottom: spacing.xs,
                backgroundColor: colors.background,
              }}
            >
              <AppText variant="subheadStrong">{dayLabel(section.date, today)}</AppText>
              {section.totalMinor > 0 ? (
                <Money minor={section.totalMinor} currency={currency} sign="expense" variant="subhead" tone="secondary" />
              ) : null}
            </View>
          ) : null
        }
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        stickySectionHeadersEnabled
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + layout.tabBarHeight + spacing.xl,
          paddingHorizontal: spacing.gutter,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
        }}
      />
    </View>
  );
}
