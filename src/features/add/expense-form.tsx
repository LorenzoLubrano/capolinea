import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import { useRepositories } from '@/data/provider';
import { useAddTransaction, useSnapshot } from '@/data/queries';
import { addDays } from '@/domain/dates';
import { appendKeypadKey, inputToMinor, minorToInput, type KeypadKey } from '@/domain/money';
import type { Id } from '@/domain/types';
import { it } from '@/i18n/it';
import { dayLabel, shortDate } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, radius, spacing, type, useTheme } from '@/theme';

import { Keypad } from './keypad';
import { defaultAccountId, frequentCategories } from './suggestions';

const QUICK_CATEGORIES = 5;

/** `1234567,8` shown as `1.234.567,8`. */
function groupInput(input: string): string {
  const [integer, decimals] = input.split(',');
  const grouped = (integer || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimals === undefined ? grouped : `${grouped},${decimals}`;
}

function Chip({
  label,
  selected,
  onPress,
  leading,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        minHeight: 40,
        paddingLeft: leading ? spacing.xs + 2 : spacing.smd,
        paddingRight: spacing.smd,
        borderRadius: radius.full,
        backgroundColor: selected ? colors.ink : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.ink : colors.hairline,
      }}
    >
      {leading}
      <AppText variant="subheadStrong" tone={selected ? 'onInk' : 'primary'} numberOfLines={1}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/** New expense: amount, category, save. Account and date are already chosen; everything else is optional. */
export function ExpenseForm() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ merchant?: string; amount?: string; category?: string; account?: string }>();
  const { data } = useSnapshot();
  const addTransaction = useAddTransaction();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const showToast = useToast((s) => s.show);
  const masked = useSettings((s) => s.privacy);

  const [input, setInput] = useState(params.amount ? minorToInput(Number(params.amount)) : '');
  const [categoryId, setCategoryId] = useState<Id | undefined>(params.category);
  const [accountId, setAccountId] = useState<Id | undefined>(params.account);
  const [dayOffset, setDayOffset] = useState(0);
  const [picker, setPicker] = useState<'account' | 'date' | null>(null);
  const [allCategories, setAllCategories] = useState(false);
  const [details, setDetails] = useState(false);
  const [merchant, setMerchant] = useState(params.merchant ?? '');
  const [note, setNote] = useState('');

  const quick = useMemo(() => (data ? frequentCategories(data, QUICK_CATEGORIES) : []), [data]);
  if (!data) return <View style={{ flex: 1 }} />;

  const account = accountId ?? defaultAccountId(data);
  const accounts = [...data.accounts].filter((a) => !a.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const accountName = accounts.find((a) => a.id === account)?.name ?? '';
  const date = addDays(data.today, -dayOffset);
  const expenseCategories = data.categories
    .filter((c) => c.kind === 'expense' && !c.archived)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const shown = allCategories
    ? expenseCategories
    : [...quick, ...expenseCategories.filter((c) => c.id === categoryId && !quick.some((q) => q.id === c.id))];
  const amountMinor = inputToMinor(input);
  const ready = amountMinor > 0 && !!categoryId;

  const onKey = (key: KeypadKey) => setInput((current) => appendKeypadKey(current, key));

  const save = () => {
    if (!ready || addTransaction.isPending) return;
    addTransaction.mutate(
      {
        type: 'expense',
        amountMinor,
        currency: data.currency,
        date,
        accountId: account,
        categoryId,
        merchant: merchant.trim() || undefined,
        notes: note.trim() || undefined,
        tags: [],
        isRecurring: false,
      },
      {
        onSuccess: (tx) => {
          haptics.success();
          router.back();
          showToast({
            text: it.add.saved,
            actionLabel: it.add.undo,
            onAction: () => {
              repos
                .deleteTransaction(tx.id)
                .then(() => queryClient.invalidateQueries({ queryKey: ['snapshot'] }))
                .then(() => showToast({ text: it.add.undone }));
            },
          });
        },
      },
    );
  };

  const saveLabel = !amountMinor
    ? it.add.typeAmount
    : !categoryId
      ? it.add.chooseCategory
      : `${it.add.save} ${formatMoney(amountMinor, data.currency, { masked })}`;

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, paddingTop: spacing.smd, minHeight: 52 }}>
        <PressableScale accessibilityRole="button" feedback="dim" onPress={() => router.back()} style={{ minHeight: 44, minWidth: 72, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
          <AppText variant="callout">{it.add.cancel}</AppText>
        </PressableScale>
        <AppText variant="title3" accessibilityRole="header">
          {it.add.newExpense}
        </AppText>
        <View style={{ minWidth: 72 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md, paddingBottom: spacing.md }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.xs }}>
          <Chip
            label={accountName}
            selected={picker === 'account'}
            onPress={() => setPicker(picker === 'account' ? null : 'account')}
            leading={<Icon name="CaretDown" size={14} color={picker === 'account' ? colors.onInk : colors.ink} />}
          />
          <Chip
            label={dayLabel(date, data.today)}
            selected={picker === 'date'}
            onPress={() => setPicker(picker === 'date' ? null : 'date')}
            leading={<Icon name="CaretDown" size={14} color={picker === 'date' ? colors.onInk : colors.ink} />}
          />
        </View>

        {picker === 'account' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
            {accounts.map((a) => (
              <Chip key={a.id} label={a.name} selected={a.id === account} onPress={() => { haptics.selection(); setAccountId(a.id); setPicker(null); }} />
            ))}
          </View>
        ) : null}
        {picker === 'date' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
            {Array.from({ length: 7 }, (_, offset) => {
              const day = addDays(data.today, -offset);
              const label = offset < 2 ? dayLabel(day, data.today) : shortDate(day);
              return <Chip key={day} label={label} selected={offset === dayOffset} onPress={() => { haptics.selection(); setDayOffset(offset); setPicker(null); }} />;
            })}
          </View>
        ) : null}

        <View accessible accessibilityLabel={`${it.add.newExpense}: ${groupInput(input)} euro`} style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
          <AppText variant="amountInput" tone={input ? 'primary' : 'tertiary'} numberOfLines={1} adjustsFontSizeToFit>
            {groupInput(input)}
            <AppText variant="displayCents" tone="secondary">
              {' €'}
            </AppText>
          </AppText>
          {merchant ? (
            <AppText variant="subhead" tone="secondary">
              {merchant}
            </AppText>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {shown.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={c.id === categoryId}
              onPress={() => {
                haptics.selection();
                setCategoryId(c.id === categoryId ? undefined : c.id);
              }}
              leading={<LineBadge color={c.color} name={c.name} size={28} />}
            />
          ))}
          <Chip label={allCategories ? it.add.lessCategories : it.add.allCategories} onPress={() => setAllCategories(!allCategories)} />
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ expanded: details }}
          feedback="dim"
          onPress={() => setDetails(!details)}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, borderTopWidth: 1, borderBottomWidth: details ? 0 : 1, borderColor: colors.hairline }}
        >
          <AppText variant="callout">
            {it.add.details}
            <AppText variant="subhead" tone="secondary">{`  ${it.add.detailsHint}`}</AppText>
          </AppText>
          <Icon name={details ? 'CaretDown' : 'CaretRight'} size={16} color={colors.inkSecondary} />
        </PressableScale>
        {details ? (
          <View style={{ gap: spacing.smd }}>
            {[
              { label: it.add.merchant, value: merchant, set: setMerchant, placeholder: it.add.merchantPlaceholder },
              { label: it.add.note, value: note, set: setNote, placeholder: it.add.notePlaceholder },
            ].map((field) => (
              <View key={field.label} style={{ gap: spacing.xs }}>
                <AppText variant="footnote" tone="secondary">
                  {field.label}
                </AppText>
                <TextInput
                  accessibilityLabel={field.label}
                  value={field.value}
                  onChangeText={field.set}
                  placeholder={field.placeholder}
                  placeholderTextColor={colors.inkTertiary}
                  selectionColor={colors.ink}
                  style={[type.body, { color: colors.ink, minHeight: 48, paddingHorizontal: spacing.smd, borderRadius: radius.key, backgroundColor: colors.surfaceMuted }]}
                />
              </View>
            ))}
            <AppText variant="footnote" tone="secondary">
              {it.add.moreSoon}
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, gap: spacing.smd, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        <Keypad onKey={onKey} onClear={() => setInput('')} />
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy: addTransaction.isPending }}
          disabled={!ready}
          onPress={save}
          style={{ height: 56, borderRadius: radius.control, borderCurve: 'continuous', backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
        >
          <AppText variant="bodyStrong" tone="onInk">
            {saveLabel}
          </AppText>
        </PressableScale>
      </View>
    </View>
  );
}
