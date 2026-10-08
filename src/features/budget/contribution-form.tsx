import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Calendar } from '@/components/calendar';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useAddContribution, useRemoveContribution, useSnapshot } from '@/data/queries';
import { goalProgress } from '@/domain/goals';
import { appendKeypadKey, inputToMinor, minorToInput } from '@/domain/money';
import type { LocalDate } from '@/domain/types';
import { AmountDisplay, SaveBar } from '@/features/add/form-parts';
import { it } from '@/i18n/it';
import { useDiscardGuard } from '@/services/discard-guard';
import { dayLabel } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, spacing, useTheme } from '@/theme';

/** Versamento: put money towards a goal. The monthly quota is one tap away. */
export function ContributionForm() {
  const { colors } = useTheme();
  const { goal: goalId } = useLocalSearchParams<{ goal: string }>();
  const { data } = useSnapshot();
  const add = useAddContribution();
  const remove = useRemoveContribution();
  const showToast = useToast((s) => s.show);
  const masked = useSettings((s) => s.privacy);
  const [input, setInput] = useState('');
  const [date, setDate] = useState<LocalDate | null>(null);
  const [picker, setPicker] = useState(false);
  const allowLeave = useDiscardGuard({ input, date });

  const goal = data?.goals.find((g) => g.id === goalId);
  if (!data || !goal) return <View style={{ flex: 1 }} />;

  const day = date ?? data.today;
  const progress = goalProgress(goal, data.today);
  const amountMinor = inputToMinor(input);
  const money = (minor: number) => formatMoney(minor, goal.currency, { masked });

  const onSave = () => {
    if (!amountMinor || add.isPending) return;
    add.mutate(
      { goalId: goal.id, date: day, amountMinor },
      {
        onSuccess: (updated) => {
          haptics.success();
          allowLeave();
          router.back();
          const added = updated.contributions[updated.contributions.length - 1];
          showToast({
            text: it.goals.contribution.done(money(amountMinor), goal.name),
            actionLabel: it.add.undo,
            onAction: () =>
              remove.mutate({ goalId: goal.id, contributionId: added.id }, { onSuccess: () => showToast({ text: it.goals.contribution.removed }) }),
          });
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={it.goals.contribution.title} left={{ label: it.add.cancel, onPress: () => router.back() }} />
      <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', paddingTop: spacing.xs }}>
          <Chip
            label={dayLabel(day, data.today)}
            selected={picker}
            onPress={() => setPicker(!picker)}
            leading={<Icon name="CaretDown" size={14} color={picker ? colors.onInk : colors.ink} />}
          />
        </View>
        {picker ? (
          <Calendar
            value={day}
            today={data.today}
            onChange={(d) => {
              setDate(d);
              setPicker(false);
            }}
          />
        ) : null}
        <AmountDisplay input={input} label={it.goals.contribution.title} caption={it.goals.contribution.to(goal.name)} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'baseline', gap: spacing.xs }}>
          <AppText variant="subhead" tone="secondary">
            {it.goals.contribution.missing}
          </AppText>
          <Money minor={progress.remainingMinor} currency={goal.currency} variant="subheadStrong" wholeUnits />
        </View>
        {progress.monthlyNeededMinor ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Chip
              label={it.goals.contribution.suggested(formatMoney(progress.monthlyNeededMinor, goal.currency, { masked, wholeUnits: true }))}
              onPress={() => {
                haptics.selection();
                setInput(minorToInput(progress.monthlyNeededMinor!));
              }}
            />
          </View>
        ) : null}
      </ScrollView>
      <SaveBar
        onKey={(key) => setInput((current) => appendKeypadKey(current, key))}
        onClear={() => setInput('')}
        label={amountMinor ? `${it.goals.detail.contribute} ${money(amountMinor)}` : it.add.typeAmount}
        ready={amountMinor > 0}
        busy={add.isPending}
        onSave={onSave}
      />
      <ToastHost top={60} />
    </View>
  );
}
