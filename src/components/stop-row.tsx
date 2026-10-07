import { View } from 'react-native';

import type { Category, Id, Transaction } from '@/domain/types';
import { it } from '@/i18n/it';
import { accessibleMoney } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

import { Money } from './money';
import { PressableScale } from './pressable-scale';
import { AppText } from './text';

const DOT = 14;

/**
 * A movement as a stop on a line: a ring in the category's colour, the line running through
 * the stops of the same group. Transfers get a grey ring: they are not spending.
 */
export function StopRow({
  tx,
  category,
  subtitle,
  currency,
  meId,
  first,
  last,
  onPress,
}: {
  tx: Transaction;
  category?: Category;
  subtitle: string;
  currency: string;
  meId: Id;
  first: boolean;
  last: boolean;
  onPress?: () => void;
}) {
  const { colors, lineColor } = useTheme();
  const masked = useSettings((state) => state.privacy);
  const title = tx.merchant ?? tx.description ?? category?.name ?? it.detail.types[tx.type];
  const isIn = tx.type === 'income' || tx.type === 'refund';
  const sign = tx.type === 'transfer' ? 'none' : isIn ? 'income' : 'expense';
  const share = tx.split?.find((s) => s.personId === meId)?.amountMinor;
  const ring = tx.type === 'transfer' ? colors.inkTertiary : lineColor(category?.color ?? 'grey').fill;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}, ${accessibleMoney(tx.amountMinor, currency, { masked })}`}
      feedback="dim"
      disabled={!onPress}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 60 }}
    >
      <View style={{ width: DOT, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' }}>
        {first && last ? null : (
          <View
            style={{
              position: 'absolute',
              top: first ? '50%' : 0,
              bottom: last ? '50%' : 0,
              width: 2,
              backgroundColor: colors.hairline,
            }}
          />
        )}
        <View
          style={{
            width: DOT,
            height: DOT,
            borderRadius: DOT / 2,
            borderWidth: 3,
            borderColor: ring,
            backgroundColor: colors.background,
          }}
        />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs, paddingVertical: spacing.sm }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing.xxs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Money minor={tx.amountMinor} currency={currency} sign={sign} variant="bodyStrong" />
        {share !== undefined && share !== tx.amountMinor ? (
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <AppText variant="footnote" tone="secondary">
              {it.transactions.myShare}
            </AppText>
            <Money minor={share} currency={currency} variant="footnote" tone="secondary" />
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}
