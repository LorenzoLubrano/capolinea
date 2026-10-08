import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import type { MerchantSpending, PeriodUnit } from '@/domain/analysis';
import type { Category } from '@/domain/types';
import { it } from '@/i18n/it';
import { accessibleMoney, formatMoney } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

import type { Comparison } from './analysis';
import { comparisonWords } from './words';

/** One question per section: the question as the heading, the answer in words under it. */
export function AnalysisSection({ question, answer, children, ruled = true }: { question: string; answer?: string | null; children?: ReactNode; ruled?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.smd, ...(ruled ? { borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: spacing.md } : null) }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="title3" accessibilityRole="header">
          {question}
        </AppText>
        {answer ? (
          <AppText variant="subhead" tone="secondary">
            {answer}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** The comparison with the usual: an arrow and the words, never red (more spending is not an error). */
export function ComparisonLine({ comparison, current, unit, currency }: { comparison: Comparison | null; current: boolean; unit: PeriodUnit; currency: string }) {
  const { colors } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const words = comparisonWords(comparison, current, unit, (minor) => formatMoney(minor, currency, { masked, wholeUnits: true }));
  if (!words) {
    return (
      <AppText variant="subhead" tone="secondary">
        {it.analytics.usual.noData}
      </AppText>
    );
  }
  return (
    <View style={{ gap: spacing.xxs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {words.direction !== 'flat' ? <Icon name={words.direction === 'up' ? 'ArrowUp' : 'ArrowDown'} size={14} weight="bold" color={colors.ink} /> : null}
        <AppText variant="subheadStrong" style={{ flexShrink: 1 }}>
          {words.text}
        </AppText>
      </View>
      <AppText variant="subhead" tone="secondary">
        {words.usual}
      </AppText>
    </View>
  );
}

/** A merchant as a stop in its category's colour, with purchases and total. */
export function MerchantRow({
  merchant,
  category,
  currency,
  showCategory = true,
  onPress,
}: {
  merchant: MerchantSpending;
  category?: Category;
  currency: string;
  /** Off inside a category's own sheet, where the name would repeat on every row. */
  showCategory?: boolean;
  onPress: () => void;
}) {
  const { colors, lineColor } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const purchases = it.analytics.merchants.purchases(merchant.count);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${merchant.name}, ${purchases}, ${accessibleMoney(merchant.spentMinor, currency, { masked })}`}
      feedback="dim"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
    >
      <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: lineColor(category?.color ?? 'grey').fill }} />
      <View style={{ flex: 1, gap: spacing.xxs, paddingVertical: spacing.sm }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {merchant.name}
        </AppText>
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {category && showCategory ? `${purchases} · ${category.name}` : purchases}
        </AppText>
      </View>
      <Money minor={merchant.spentMinor} currency={currency} variant="subheadStrong" />
      <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
    </PressableScale>
  );
}

/** "Mostra tutti (12)" / "Mostra meno" under a list cut short. */
export function ShowMore({ expanded, total, label, onPress }: { expanded: boolean; total: number; label: (n: number) => string; onPress: () => void }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      feedback="dim"
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
    >
      <AppText variant="subheadStrong">{expanded ? it.analytics.showLess : label(total)}</AppText>
    </PressableScale>
  );
}

/** A text link to another screen: `Vedi gli abbonamenti ›`. */
export function LinkRow({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="link"
      feedback="dim"
      onPress={onPress}
      style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' }}
    >
      <AppText variant="subheadStrong">{label}</AppText>
      <Icon name="CaretRight" size={14} color={colors.ink} weight="bold" />
    </PressableScale>
  );
}
