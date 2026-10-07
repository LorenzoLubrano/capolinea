import { Link } from 'expo-router';
import { View } from 'react-native';

import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import type { Category, Transaction } from '@/domain/types';
import { it } from '@/i18n/it';
import { dayLabel } from '@/services/format/dates';
import { spacing, useTheme } from '@/theme';

const DOT = 14;

/** The latest movements read as stops along one line. */
export function LatestStops({
  transactions,
  categories,
  today,
  currency,
}: {
  transactions: Transaction[];
  categories: Category[];
  today: string;
  currency: string;
}) {
  const { colors, lineColor } = useTheme();
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
        <View
          style={{
            position: 'absolute',
            left: DOT / 2 - 1,
            top: spacing.lg,
            bottom: spacing.lg,
            width: 2,
            backgroundColor: colors.hairline,
          }}
        />
        {transactions.map((tx) => {
          const category = tx.categoryId ? byId.get(tx.categoryId) : undefined;
          const line = lineColor(category?.color ?? 'grey');
          const title = tx.merchant ?? tx.description ?? category?.name ?? '';
          const isIncome = tx.type === 'income' || tx.type === 'refund';
          return (
            <View key={tx.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, paddingVertical: spacing.sm, minHeight: 52 }}>
              <View
                style={{
                  width: DOT,
                  height: DOT,
                  borderRadius: DOT / 2,
                  borderWidth: 3,
                  borderColor: tx.type === 'transfer' ? colors.inkTertiary : line.fill,
                  backgroundColor: colors.background,
                }}
              />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {title}
                </AppText>
                <AppText variant="footnote" tone="secondary" numberOfLines={1}>
                  {[category?.name, dayLabel(tx.date, today)].filter(Boolean).join(' · ')}
                </AppText>
              </View>
              <Money
                minor={tx.amountMinor}
                currency={currency}
                sign={tx.type === 'transfer' ? 'none' : isIncome ? 'income' : 'expense'}
                variant="bodyStrong"
                label={title}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}
