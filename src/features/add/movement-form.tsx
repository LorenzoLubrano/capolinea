import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Calendar } from '@/components/calendar';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useRepositories } from '@/data/provider';
import { useAddTransaction, useSnapshot, useUpdateTransaction } from '@/data/queries';
import type { Snapshot, TransactionChanges } from '@/data/repositories';
import { appendKeypadKey, inputToMinor, minorToInput, type KeypadKey } from '@/domain/money';
import { computeShares, refundableMinor } from '@/domain/splits';
import type { Id, LocalDate, Transaction } from '@/domain/types';
import { it } from '@/i18n/it';
import { dayLabel, shortDate } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useSplitDraft } from '@/state/split-draft';
import { useToast } from '@/state/toast';
import { layout, radius, spacing, useTheme } from '@/theme';

import { AmountDisplay, ChoiceRow, DetailsSection, SaveBar, TextField } from './form-parts';
import { defaultAccountId, frequentCategories } from './suggestions';

export type MovementKind = 'expense' | 'income' | 'transfer' | 'refund';

type Params = { id?: string; of?: string; merchant?: string; amount?: string; category?: string; account?: string };

const QUICK_CATEGORIES = 5;

/**
 * New or edited movement of any kind. The route decides the kind; `id` edits an existing one,
 * `of` names the expense a new refund belongs to.
 */
export function MovementForm({ kind }: { kind: MovementKind }) {
  const params = useLocalSearchParams<Params>();
  const { data } = useSnapshot();
  if (!data) return <View style={{ flex: 1 }} />;
  const editing = params.id ? data.transactions.find((t) => t.id === params.id) : undefined;
  const original = kind === 'refund' ? data.transactions.find((t) => t.id === (editing?.refundOfId ?? params.of)) : undefined;
  return <MovementFormBody key={editing?.id ?? 'new'} kind={kind} data={data} editing={editing} original={original} params={params} />;
}

function initialAccount(kind: MovementKind, data: Snapshot, original?: Transaction): Id {
  if (original) return original.accountId;
  if (kind === 'income') {
    const lastIncome = data.transactions.filter((t) => t.type === 'income').sort((a, b) => b.date.localeCompare(a.date))[0];
    if (lastIncome) return lastIncome.accountId;
  }
  return defaultAccountId(data);
}

function MovementFormBody({
  kind,
  data,
  editing,
  original,
  params,
}: {
  kind: MovementKind;
  data: Snapshot;
  editing?: Transaction;
  original?: Transaction;
  params: Params;
}) {
  const { colors } = useTheme();
  const addTransaction = useAddTransaction();
  const updateTransaction = useUpdateTransaction();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const masked = useSettings((s) => s.privacy);
  const { draft: splitDraft, setDraft: setSplitDraft } = useSplitDraft();

  const accounts = [...data.accounts].filter((a) => !a.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const refundLimit = original ? refundableMinor(original, data.transactions) + (editing?.amountMinor ?? 0) : Infinity;

  const [input, setInput] = useState(() => {
    const minor = editing?.amountMinor ?? (params.amount ? Number(params.amount) : original ? refundableMinor(original, data.transactions) : 0);
    return minor ? minorToInput(minor) : '';
  });
  const [categoryId, setCategoryId] = useState<Id | undefined>(editing?.categoryId ?? params.category ?? original?.categoryId);
  const [accountId, setAccountId] = useState<Id>(editing?.accountId ?? params.account ?? initialAccount(kind, data, original));
  const [toAccountId, setToAccountId] = useState<Id | undefined>(
    editing?.toAccountId ?? (kind === 'transfer' ? accounts.find((a) => a.id !== accountId)?.id : undefined),
  );
  const [date, setDate] = useState<LocalDate>(editing?.date ?? data.today);
  const [picker, setPicker] = useState<'account' | 'date' | null>(null);
  const [allCategories, setAllCategories] = useState(false);
  const [details, setDetails] = useState(!!(editing?.merchant || editing?.notes || editing?.description || editing?.split));
  const [merchant, setMerchant] = useState(editing?.merchant ?? params.merchant ?? original?.merchant ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [note, setNote] = useState(editing?.notes ?? '');

  // The split sheet hands its draft back through a store: start it from this movement, or empty.
  useEffect(() => {
    if (kind !== 'expense') return;
    const split = editing?.split;
    setSplitDraft(
      split
        ? {
            personIds: split.map((s) => s.personId),
            mode: 'amounts',
            values: Object.fromEntries(split.map((s) => [s.personId, s.amountMinor])),
            paidBy: editing?.paidByPersonId ?? data.meId,
          }
        : null,
    );
  }, [kind, editing, data.meId, setSplitDraft]);

  const quick = useMemo(() => frequentCategories(data, QUICK_CATEGORIES), [data]);
  const amountMinor = inputToMinor(input);
  const accountName = accounts.find((a) => a.id === accountId)?.name ?? '';
  const people = new Map(data.people.map((p) => [p.id, p.name]));
  const split = kind === 'expense' && splitDraft ? computeShares(amountMinor, splitDraft) : null;
  const money = (minor: number) => formatMoney(minor, data.currency, { masked });
  const title = editing ? it.add.titles.edit[kind] : it.add.titles.new[kind];

  const categories =
    kind === 'income'
      ? data.categories.filter((c) => c.kind === 'income' && !c.archived).sort((a, b) => a.sortOrder - b.sortOrder)
      : (() => {
          const expense = data.categories.filter((c) => c.kind === 'expense' && !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);
          return allCategories ? expense : [...quick, ...expense.filter((c) => c.id === categoryId && !quick.some((q) => q.id === c.id))];
        })();

  const missing = (() => {
    if (!amountMinor) return it.add.typeAmount;
    if (kind === 'expense' && !categoryId) return it.add.chooseCategory;
    if (kind === 'income' && !categoryId) return it.add.chooseIncomeType;
    if (kind === 'transfer' && (!toAccountId || toAccountId === accountId)) return it.add.chooseAccounts;
    if (kind === 'refund' && amountMinor > refundLimit) return it.add.atMost(money(refundLimit));
    if (split && !split.ok) return it.add.checkSplit;
    return null;
  })();
  const busy = addTransaction.isPending || updateTransaction.isPending;
  const saveLabel = missing ?? (editing ? it.add.saveChanges : `${it.add.save} ${money(amountMinor)}`);

  const fields = (): TransactionChanges => {
    const base = { amountMinor, date, accountId, notes: note.trim() || undefined };
    switch (kind) {
      case 'transfer':
        return { ...base, toAccountId, description: description.trim() || undefined };
      case 'refund':
        return { ...base, categoryId: original?.categoryId, merchant: merchant.trim() || undefined, refundOfId: original?.id };
      case 'income':
        return { ...base, categoryId, merchant: merchant.trim() || undefined };
      default: {
        const shares = split?.ok ? split.shares : undefined;
        return {
          ...base,
          categoryId,
          merchant: merchant.trim() || undefined,
          split: shares,
          paidByPersonId: shares ? splitDraft?.paidBy : undefined,
        };
      }
    }
  };

  const save = () => {
    if (missing || busy) return;
    const changes = fields();
    if (editing) {
      const previous = Object.fromEntries(Object.keys(changes).map((key) => [key, editing[key as keyof Transaction]])) as TransactionChanges;
      updateTransaction.mutate(
        { id: editing.id, changes },
        {
          onSuccess: () => {
            haptics.success();
            router.back();
            showToast({
              text: it.add.updated,
              actionLabel: it.add.undo,
              onAction: () => updateTransaction.mutate({ id: editing.id, changes: previous }, { onSuccess: () => showToast({ text: it.add.reverted }) }),
            });
          },
        },
      );
      return;
    }
    addTransaction.mutate(
      { ...changes, amountMinor, date, accountId, type: kind, currency: data.currency, tags: [], isRecurring: false },
      {
        onSuccess: (tx) => {
          haptics.success();
          router.back();
          showToast({
            text: it.add.savedKinds[kind],
            actionLabel: it.add.undo,
            onAction: () => {
              repos
                .deleteTransaction(tx.id)
                .then(() => queryClient.invalidateQueries({ queryKey: ['snapshot'] }))
                .then(() => showToast({ text: it.add.undoneKinds[kind] }));
            },
          });
        },
      },
    );
  };

  const accountChips = (selected: Id | undefined, onPick: (id: Id) => void, exclude?: Id) =>
    accounts
      .filter((a) => a.id !== exclude)
      .map((a) => (
        <Chip
          key={a.id}
          label={a.name}
          selected={a.id === selected}
          onPress={() => {
            haptics.selection();
            onPick(a.id);
          }}
        />
      ));

  const caption = kind === 'refund' && original ? it.add.refundOf(original.merchant ?? '') : merchant || undefined;

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={title} left={{ label: it.add.cancel, onPress: () => router.back() }} />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md, paddingBottom: spacing.md }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.xs }}>
          {kind !== 'transfer' ? (
            <Chip
              label={accountName}
              selected={picker === 'account'}
              onPress={() => setPicker(picker === 'account' ? null : 'account')}
              leading={<Icon name="CaretDown" size={14} color={picker === 'account' ? colors.onInk : colors.ink} />}
            />
          ) : null}
          <Chip
            label={dayLabel(date, data.today)}
            selected={picker === 'date'}
            onPress={() => setPicker(picker === 'date' ? null : 'date')}
            leading={<Icon name="CaretDown" size={14} color={picker === 'date' ? colors.onInk : colors.ink} />}
          />
        </View>

        {picker === 'account' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
            {accountChips(accountId, (id) => {
              setAccountId(id);
              setPicker(null);
            })}
          </View>
        ) : null}
        {picker === 'date' ? (
          <Calendar
            value={date}
            today={data.today}
            onChange={(day) => {
              setDate(day);
              setPicker(null);
            }}
          />
        ) : null}

        <AmountDisplay input={input} label={title} caption={caption} />

        {kind === 'expense' || kind === 'income' ? (
          <View style={{ gap: spacing.sm }}>
            {kind === 'income' ? (
              <AppText variant="subheadStrong" tone="secondary">
                {it.add.incomeType}
              </AppText>
            ) : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  label={c.name}
                  selected={c.id === categoryId}
                  onPress={() => {
                    haptics.selection();
                    setCategoryId(c.id === categoryId ? undefined : c.id);
                  }}
                  leading={
                    kind === 'expense' ? (
                      <LineBadge color={c.color} name={c.name} size={28} />
                    ) : (
                      <Icon name={c.icon} size={18} color={c.id === categoryId ? colors.onInk : colors.ink} />
                    )
                  }
                />
              ))}
              {kind === 'expense' ? (
                <Chip label={allCategories ? it.add.lessCategories : it.add.allCategories} onPress={() => setAllCategories(!allCategories)} />
              ) : null}
            </View>
          </View>
        ) : null}

        {kind === 'transfer' ? (
          <>
            <ChoiceRow label={it.add.from}>
              {accountChips(accountId, (id) => {
                setAccountId(id);
                if (id === toAccountId) setToAccountId(accounts.find((a) => a.id !== id)?.id);
              })}
            </ChoiceRow>
            <ChoiceRow label={it.add.to}>{accountChips(toAccountId, setToAccountId, accountId)}</ChoiceRow>
            <AppText variant="footnote" tone="secondary">
              {it.add.transferRule}
            </AppText>
          </>
        ) : null}

        {kind === 'refund' && original ? (
          <View style={{ gap: spacing.xs, padding: spacing.md, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: colors.surfaceMuted }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
              <AppText variant="subhead">{`${original.merchant ?? ''} · ${shortDate(original.date)}`}</AppText>
              <Money minor={original.amountMinor} currency={original.currency} variant="subheadStrong" />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
              <AppText variant="subhead" tone="secondary">
                {it.add.refundable}
              </AppText>
              <Money minor={refundLimit} currency={original.currency} variant="subhead" tone="secondary" />
            </View>
            <AppText variant="footnote" tone="secondary">
              {it.add.refundRule}
            </AppText>
          </View>
        ) : null}

        <DetailsSection open={details} onToggle={() => setDetails(!details)} hint={it.add.detailsHints[kind]}>
          {kind === 'expense' ? <TextField label={it.add.merchant} value={merchant} onChangeText={setMerchant} placeholder={it.add.merchantPlaceholder} /> : null}
          {kind === 'income' ? <TextField label={it.add.payer} value={merchant} onChangeText={setMerchant} placeholder={it.add.payerPlaceholder} /> : null}
          {kind === 'transfer' ? (
            <TextField label={it.add.description} value={description} onChangeText={setDescription} placeholder={it.add.descriptionPlaceholder} />
          ) : null}
          <TextField label={it.add.note} value={note} onChangeText={setNote} placeholder={it.add.notePlaceholder} />
          {kind === 'expense' ? (
            <PressableScale
              accessibilityRole="button"
              feedback="dim"
              onPress={() => {
                if (!amountMinor) {
                  showToast({ text: it.add.splitNeedsAmount });
                  return;
                }
                router.push({ pathname: '/split', params: { total: String(amountMinor) } });
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 56, paddingHorizontal: spacing.smd, borderRadius: radius.key, backgroundColor: colors.surfaceMuted }}
            >
              <Icon name="Users" size={20} color={colors.ink} />
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <AppText variant="bodyStrong">{it.add.split}</AppText>
                {split?.ok && splitDraft ? (
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <AppText variant="footnote" tone="secondary" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {it.add.splitSummary(splitDraft.personIds.filter((id) => id !== data.meId).map((id) => people.get(id)).join(', '))}
                    </AppText>
                    <Money minor={split.shares.find((s) => s.personId === data.meId)?.amountMinor ?? 0} currency={data.currency} variant="footnote" tone="secondary" />
                  </View>
                ) : (
                  <AppText variant="footnote" tone={split && !split.ok ? 'warning' : 'secondary'}>
                    {split && !split.ok ? it.add.checkSplit : it.add.splitNone}
                  </AppText>
                )}
              </View>
              <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
            </PressableScale>
          ) : null}
        </DetailsSection>
      </ScrollView>

      <SaveBar
        onKey={(key: KeypadKey) => setInput((current) => appendKeypadKey(current, key))}
        onClear={() => setInput('')}
        label={saveLabel}
        ready={!missing}
        busy={busy}
        onSave={save}
      />
      <ToastHost top={60} />
    </View>
  );
}
