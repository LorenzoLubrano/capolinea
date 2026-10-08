import { router } from 'expo-router';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { GoalBadge, GoalLine } from '@/components/goal-line';
import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import type { Snapshot } from '@/data/repositories';
import { goalProgress, goalStops, type GoalProgress } from '@/domain/goals';
import type { Goal } from '@/domain/types';
import { it } from '@/i18n/it';
import { monthYear } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { formatPercent } from '@/services/format/numbers';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

/** One sentence on where the goal is going: monthly quota for the date, the pace's arrival, or a date already gone. */
export function goalOutlook(goal: Goal, progress: GoalProgress, money: (minor: number) => string): string {
  if (progress.reached) return it.goals.reached;
  if (progress.overdue && goal.targetDate) return it.goals.overdue(monthYear(goal.targetDate).toLowerCase(), money(progress.remainingMinor));
  if (progress.monthlyNeededMinor !== null && goal.targetDate)
    return it.goals.monthly(money(progress.monthlyNeededMinor), monthYear(goal.targetDate).toLowerCase());
  if (progress.projectedDate) return it.goals.projected(monthYear(progress.projectedDate).toLowerCase());
  return it.goals.noPace;
}

/** Obiettivi: each goal as a ring closing towards its target. */
export function GoalsSection({ data }: { data: Snapshot }) {
  const { colors, lineColor } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const money = (minor: number) => formatMoney(minor, data.currency, { masked, wholeUnits: true });
  const goals = data.goals.map((goal) => ({ goal, progress: goalProgress(goal, data.today) }));
  const saved = goals.reduce((sum, g) => sum + g.progress.savedMinor, 0);

  if (goals.length === 0) {
    return (
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title3">{it.goals.empty.title}</AppText>
        <AppText tone="secondary">{it.goals.empty.body}</AppText>
        <Button label={it.goals.add} icon="Plus" onPress={() => router.push('/goal-edit')} style={{ alignSelf: 'flex-start' }} />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="subhead" tone="secondary">
        {it.goals.saved(money(saved), goals.length)}
      </AppText>
      <View>
        {goals.map(({ goal, progress }) => {
          const color = lineColor(goal.color).fill;
          const outlook = goalOutlook(goal, progress, money);
          return (
            <PressableScale
              key={goal.id}
              accessibilityRole="button"
              accessibilityLabel={`${goal.name}, ${it.goals.percent(formatPercent(progress.ratio))}, ${outlook}`}
              feedback="dim"
              onPress={() => router.push({ pathname: '/goal/[id]', params: { id: goal.id } })}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
            >
              <GoalBadge icon={goal.icon} reached={progress.reached} />
              <View style={{ flex: 1, gap: spacing.xs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm }}>
                  <AppText variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {goal.name}
                  </AppText>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'baseline' }}>
                    <Money minor={progress.savedMinor} currency={goal.currency} variant="subheadStrong" wholeUnits />
                    <AppText variant="subhead" tone="secondary">
                      {it.budget.of}
                    </AppText>
                    <Money minor={goal.targetMinor} currency={goal.currency} variant="subhead" tone="secondary" wholeUnits />
                  </View>
                </View>
                <GoalLine ratio={progress.ratio} stops={goalStops(goal, data.today)} color={color} />
                <AppText variant="footnote" tone="secondary" numberOfLines={2}>
                  {outlook}
                </AppText>
              </View>
              <View style={{ alignSelf: 'center' }}>
                <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
              </View>
            </PressableScale>
          );
        })}
      </View>
      <Button label={it.goals.add} icon="Plus" variant="secondary" onPress={() => router.push('/goal-edit')} />
    </View>
  );
}
