import { Link, router } from 'expo-router';
import { View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { StopRow } from '@/components/stop-row';
import { AppText } from '@/components/text';
import type { Category, Id, Transaction } from '@/domain/types';
import { it } from '@/i18n/it';
import { dayLabel } from '@/services/format/dates';
import { spacing } from '@/theme';

/** The latest movements read as stops along one line. */
export function LatestStops({
  transactions,
  categories,
  today,
  currency,
  meId,
}: {
  transactions: Transaction[];
  categories: Category[];
  today: string;
  currency: string;
  meId: Id;
}) {
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="title3" accessibilityRole="header">
          {it.home.latest}
        </AppText>
        <Link href="/transactions" asChild>
          <PressableScale accessibilityRole="link" feedback="dim" style={{ minHeight: 44, justifyContent: 'center', paddingLeft: spacing.md }}>
            <AppText variant="subheadStrong">{it.home.seeAll}</AppText>
          </PressableScale>
        </Link>
      </View>
      <View>
        {transactions.map((tx, i) => {
          const category = tx.categoryId ? byId.get(tx.categoryId) : undefined;
          return (
            <StopRow
              key={tx.id}
              tx={tx}
              category={category}
              subtitle={[category?.name, dayLabel(tx.date, today)].filter(Boolean).join(' · ')}
              currency={currency}
              meId={meId}
              first={i === 0}
              last={i === transactions.length - 1}
              onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
            />
          );
        })}
      </View>
    </View>
  );
}
