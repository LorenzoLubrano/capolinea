import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Chip } from '@/components/chip';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useDeleteBudget, useRestoreBudget, useSaveBudget, useSnapshot } from '@/data/queries';
import type { Snapshot } from '@/data/repositories';
import { activeBudget, averageMonthlySpending } from '@/domain/budget';
import { monthStart } from '@/domain/dates';
import { appendKeypadKey, inputToMinor, minorToInput } from '@/domain/money';
import { spendingBetween } from '@/domain/spending';
import type { Budget, BudgetScope, Id } from '@/domain/types';
import { AmountDisplay, ChoiceRow, SaveBar } from '@/features/add/form-parts';
import { it } from '@/i18n/it';
import { useDiscardGuard } from '@/services/discard-guard';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, spacing } from '@/theme';

import { categoryProposal } from './overview';

type Params = { id?: string; scope?: BudgetScope; category?: string };

/** Create or change a budget: the whole month, or one category. The proposal is the recent average. */
export function BudgetEditor() {
  const params = useLocalSearchParams<Params>();
  const { data } = useSnapshot();
  if (!data) return <View style={{ flex: 1 }} />;
  const existing = params.id
    ? data.budgets.find((b) => b.id === params.id)
    : params.category
      ? activeBudget(data.budgets, data.today.slice(0, 7), 'category', params.category)
      : params.scope === 'global'
        ? activeBudget(data.budgets, data.today.slice(0, 7), 'global')
        : undefined;
  return <EditorBody key={existing?.id ?? 'new'} data={data} existing={existing} params={params} />;
}

function EditorBody({ data, existing, params }: { data: Snapshot; existing?: Budget; params: Params }) {
  const save = useSaveBudget();
  const remove = useDeleteBudget();
  const restore = useRestoreBudget();
  const showToast = useToast((s) => s.show);
  const masked = useSettings((s) => s.privacy);

  const scope: BudgetScope = existing?.scope ?? (params.category ? 'category' : (params.scope ?? 'global'));
  const [categoryId, setCategoryId] = useState<Id | undefined>(existing?.categoryId ?? params.category);
  const [input, setInput] = useState(existing ? minorToInput(existing.amountMinor) : '');
  const allowLeave = useDiscardGuard({ categoryId, input });
  const month = data.today.slice(0, 7);
  const options = { currency: data.currency, meId: data.meId };

  const proposal =
    scope === 'global'
      ? averageMonthlySpending(data.transactions, data.today, 3, options)
      : categoryId
        ? categoryProposal(data, categoryId)
        : 0;
  const spent = spendingBetween(data.transactions, monthStart(data.today), data.today, { ...options, categoryId: scope === 'category' ? categoryId : undefined });
  const free = data.categories
    .filter((c) => c.kind === 'expense' && !c.archived && !activeBudget(data.budgets, month, 'category', c.id))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const category = data.categories.find((c) => c.id === categoryId);
  const amountMinor = inputToMinor(input);
  const money = (minor: number) => formatMoney(minor, data.currency, { masked, wholeUnits: true });
  const title = existing ? it.budget.editor.edit : scope === 'global' ? it.budget.editor.global : it.budget.editor.category;
  const missing = !amountMinor ? it.add.typeAmount : scope === 'category' && !categoryId ? it.add.chooseCategory : null;

  const onSave = () => {
    if (missing || save.isPending) return;
    save.mutate(
      { id: existing?.id, scope, categoryId: scope === 'category' ? categoryId : undefined, amountMinor, currency: data.currency, fromMonth: existing?.fromMonth ?? month },
      {
        onSuccess: () => {
          haptics.success();
          allowLeave();
          router.back();
          showToast({ text: it.budget.editor.saved });
        },
      },
    );
  };

  const onDelete = () => {
    if (!existing) return;
    haptics.medium();
    remove.mutate(existing.id, {
      onSuccess: () => {
        allowLeave();
        router.back();
        showToast({
          text: it.budget.editor.deleted,
          actionLabel: it.add.undo,
          onAction: () => restore.mutate(existing.id, { onSuccess: () => showToast({ text: it.budget.editor.restored }) }),
        });
      },
    });
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader
        title={title}
        left={{ label: it.add.cancel, onPress: () => router.back() }}
        right={existing ? { label: it.budget.editor.delete, onPress: onDelete } : undefined}
      />
      <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md, paddingBottom: spacing.md }}>
        {scope === 'category' && existing ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.sm }}>
            <LineBadge color={category?.color ?? 'grey'} name={category?.name ?? ''} size={28} />
            <AppText variant="bodyStrong">{category?.name}</AppText>
          </View>
        ) : null}
        <AmountDisplay input={input} label={title} caption={scope === 'global' ? undefined : category?.name} />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
          {proposal > 0 ? (
            <Chip
              label={it.budget.editor.proposal(money(proposal))}
              accessibilityLabel={`${it.budget.editor.proposal(money(proposal))}, ${it.budget.editor.proposalHint}`}
              onPress={() => {
                haptics.selection();
                setInput(minorToInput(Math.round(proposal / 100) * 100));
              }}
            />
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}>
          <AppText variant="footnote" tone="secondary">
            {proposal > 0 ? `${it.budget.editor.proposalHint} · ${it.budget.editor.spentNow}` : it.budget.editor.spentNow}
          </AppText>
          <Money minor={spent} currency={data.currency} variant="footnote" tone="secondary" wholeUnits />
        </View>

        {scope === 'category' && !existing ? (
          <ChoiceRow label={it.budget.editor.chooseCategory}>
            {free.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                selected={c.id === categoryId}
                onPress={() => {
                  haptics.selection();
                  setCategoryId(c.id);
                }}
                leading={<LineBadge color={c.color} name={c.name} size={28} />}
              />
            ))}
          </ChoiceRow>
        ) : null}
      </ScrollView>
      <SaveBar
        onKey={(key) => setInput((current) => appendKeypadKey(current, key))}
        onClear={() => setInput('')}
        label={missing ?? `${it.add.save} ${formatMoney(amountMinor, data.currency, { masked })}`}
        ready={!missing}
        busy={save.isPending}
        onSave={onSave}
      />
      <ToastHost top={60} />
    </View>
  );
}
