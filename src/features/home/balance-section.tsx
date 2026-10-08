import { View } from 'react-native';

import { router } from 'expo-router';

import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import { daysInMonth } from '@/domain/dates';
import { it } from '@/i18n/it';
import { spacing, useTheme } from '@/theme';

import type { HomeSummary } from './summary';

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, gap: spacing.xxs }}>
      <AppText variant="footnote" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
      {children}
    </View>
  );
}

/** Total balance under a 2 pt ink rule, then the month's metrics. Income metrics appear only when income exists. */
export function BalanceSection({ summary, today }: { summary: HomeSummary; today: string }) {
  const { colors } = useTheme();
  const { balance, income, currency } = summary;
  const [year, month, day] = today.split('-').map(Number);
  const daysLeft = daysInMonth(year, month) - day;

  return (
    <View>
      <View style={{ height: 2, backgroundColor: colors.ink }} />
      <PressableScale
        accessibilityRole="button"
        accessibilityHint={it.home.openAccounts}
        feedback="dim"
        onPress={() => router.push('/accounts')}
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.smd,
          borderBottomWidth: 1,
          borderBottomColor: colors.hairline,
          gap: spacing.sm,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexShrink: 1 }}>
          <AppText variant="subheadStrong">{it.home.balance}</AppText>
          <AppText variant="footnote" tone="secondary">
            {it.home.accounts(balance.accountCount)}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Money minor={balance.totalMinor} currency={currency} variant="figure" label={it.home.balance} />
          <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
        </View>
      </PressableScale>
      <View style={{ flexDirection: 'row', gap: spacing.md, paddingTop: spacing.smd }}>
        {income ? (
          <>
            <Metric label={it.home.metrics.income}>
              <Money minor={income.incomeMinor} currency={currency} sign="income" variant="subheadStrong" wholeUnits />
            </Metric>
            <Metric label={it.home.metrics.subscriptions}>
              <Money minor={summary.subscriptionsMonthlyMinor} currency={currency} variant="subheadStrong" wholeUnits />
            </Metric>
            <Metric label={it.home.metrics.net}>
              <Money minor={income.netMinor} currency={currency} sign={income.netMinor >= 0 ? 'income' : 'none'} variant="subheadStrong" wholeUnits />
            </Metric>
          </>
        ) : (
          <>
            <Metric label={it.home.metrics.dailyAverage}>
              <Money minor={Math.round(summary.spentMinor / day)} currency={currency} variant="subheadStrong" />
            </Metric>
            <Metric label={it.home.metrics.subscriptions}>
              <Money minor={summary.subscriptionsMonthlyMinor} currency={currency} variant="subheadStrong" wholeUnits />
            </Metric>
            <Metric label={it.home.metrics.daysLeft}>
              <AppText variant="subheadStrong">{String(daysLeft)}</AppText>
            </Metric>
          </>
        )}
      </View>
    </View>
  );
}
