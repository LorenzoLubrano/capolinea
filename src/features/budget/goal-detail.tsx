import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GoalBadge, GoalLine } from '@/components/goal-line';
import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useAddContribution, useDeleteGoal, useRemoveContribution, useRestoreGoal, useSnapshot } from '@/data/queries';
import { goalProgress, goalStops } from '@/domain/goals';
import { it } from '@/i18n/it';
import { fullDate, monthYear } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { formatPercent } from '@/services/format/numbers';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, spacing, useTheme } from '@/theme';

import { goalOutlook } from './goals-section';

function Row({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <AppText variant="callout" tone="secondary">
        {label}
      </AppText>
      {children}
    </View>
  );
}

/** One goal: the ring, what is missing, the monthly quota, every contribution. */
export function GoalDetail() {
  const { colors, lineColor } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useSnapshot();
  const masked = useSettings((s) => s.privacy);
  const remove = useDeleteGoal();
  const restore = useRestoreGoal();
  const removeContribution = useRemoveContribution();
  const addContribution = useAddContribution();
  const showToast = useToast((s) => s.show);

  const goal = data?.goals.find((g) => g.id === id);
  if (!data) return <View style={{ flex: 1 }} />;
  if (!goal) {
    return (
      <View style={{ flex: 1 }}>
        <SheetHeader title="" left={{ label: it.detail.close, onPress: () => router.back() }} />
        <View style={{ padding: spacing.gutter }}>
          <AppText variant="title3">{it.detail.notFound.title}</AppText>
        </View>
      </View>
    );
  }

  const progress = goalProgress(goal, data.today);
  const money = (minor: number) => formatMoney(minor, goal.currency, { masked, wholeUnits: true });
  const account = data.accounts.find((a) => a.id === goal.accountId);
  const contributions = [...goal.contributions].sort((a, b) => b.date.localeCompare(a.date));

  const onDelete = () => {
    haptics.medium();
    remove.mutate(goal.id, {
      onSuccess: () => {
        router.back();
        showToast({
          text: it.goals.detail.deleted,
          actionLabel: it.add.undo,
          onAction: () => restore.mutate(goal.id, { onSuccess: () => showToast({ text: it.goals.detail.restored }) }),
        });
      },
    });
  };

  const onRemoveContribution = (contributionId: string, date: string, amountMinor: number) => {
    haptics.medium();
    removeContribution.mutate(
      { goalId: goal.id, contributionId },
      {
        onSuccess: () =>
          showToast({
            text: it.goals.detail.contributionRemoved,
            actionLabel: it.add.undo,
            onAction: () => addContribution.mutate({ goalId: goal.id, date, amountMinor }),
          }),
      },
    );
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={goal.name} left={{ label: it.detail.close, onPress: () => router.back() }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg }}>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GoalBadge icon={goal.icon} reached={progress.reached} size={56} />
            <View style={{ flex: 1, gap: spacing.xxs }}>
              <AppText variant="figure">{formatPercent(progress.ratio).replace(',0%', '%')}</AppText>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs, flexWrap: 'wrap' }}>
                <Money minor={progress.savedMinor} currency={goal.currency} variant="subheadStrong" wholeUnits label={goal.name} />
                <AppText variant="subhead" tone="secondary">
                  {it.budget.of}
                </AppText>
                <Money minor={goal.targetMinor} currency={goal.currency} variant="subhead" tone="secondary" wholeUnits />
              </View>
            </View>
          </View>
          <GoalLine ratio={progress.ratio} stops={goalStops(goal, data.today)} color={lineColor(goal.color).fill} height={10} />
          <AppText variant="subhead" tone="secondary">
            {goalOutlook(goal, progress, money)}
          </AppText>
        </View>

        <View>
          {!progress.reached ? (
            <Row label={it.goals.detail.remaining}>
              <Money minor={progress.remainingMinor} currency={goal.currency} variant="bodyStrong" wholeUnits />
            </Row>
          ) : null}
          <Row label={it.goals.detail.targetDate}>
            <AppText variant="bodyStrong" tone={progress.overdue ? 'warning' : 'primary'}>
              {goal.targetDate ? (progress.overdue ? it.goals.detail.datePassed(monthYear(goal.targetDate)) : monthYear(goal.targetDate)) : it.goals.detail.noDate}
            </AppText>
          </Row>
          {progress.monthlyNeededMinor !== null ? (
            <Row label={it.goals.detail.monthlyNeeded}>
              <Money minor={progress.monthlyNeededMinor} currency={goal.currency} variant="bodyStrong" wholeUnits />
            </Row>
          ) : null}
          {progress.projectedDate ? (
            <Row label={it.goals.detail.projected}>
              <AppText variant="bodyStrong">{monthYear(progress.projectedDate)}</AppText>
            </Row>
          ) : null}
          {account ? (
            <Row label={it.goals.detail.account}>
              <AppText variant="bodyStrong">{account.name}</AppText>
            </Row>
          ) : null}
        </View>

        <View style={{ gap: spacing.xs }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.goals.detail.contributions}
          </AppText>
          {contributions.length === 0 ? (
            <AppText variant="subhead" tone="secondary">
              {it.goals.detail.noContributions}
            </AppText>
          ) : (
            contributions.map((c) => (
              <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
                <AppText variant="body" style={{ flex: 1 }}>
                  {fullDate(c.date)}
                </AppText>
                <Money minor={c.amountMinor} currency={goal.currency} sign="income" variant="bodyStrong" />
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`${it.goals.detail.removeContribution}: ${fullDate(c.date)}`}
                  onPress={() => onRemoveContribution(c.id, c.date, c.amountMinor)}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name="X" size={16} color={colors.inkSecondary} />
                </PressableScale>
              </View>
            ))
          )}
        </View>
      </ScrollView>
      <View style={{ gap: spacing.sm, paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        {!progress.reached ? (
          <Button label={it.goals.detail.contribute} icon="PiggyBank" onPress={() => router.push({ pathname: '/goal-contribution', params: { goal: goal.id } })} />
        ) : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button label={it.detail.edit} icon="PencilSimple" variant="secondary" onPress={() => router.push({ pathname: '/goal-edit', params: { id: goal.id } })} style={{ flex: 1 }} />
          <Button label={it.detail.delete} icon="Trash" variant="destructive" busy={remove.isPending} onPress={onDelete} style={{ flex: 1 }} />
        </View>
      </View>
      <ToastHost bottom={progress.reached ? 96 : 160} />
    </View>
  );
}
