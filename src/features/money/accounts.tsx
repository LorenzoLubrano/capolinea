import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon, type IconName } from '@/components/icon';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SettingsGroup } from '@/components/settings-group';
import { SheetHeader } from '@/components/sheet-header';
import { StopRow } from '@/components/stop-row';
import { ColorPicker } from '@/components/swatch-picker';
import { AppText } from '@/components/text';
import { ThemedSwitch } from '@/components/themed-switch';
import { ToastHost } from '@/components/toast-host';
import { useDeleteAccount, useRestoreAccount, useSaveAccount, useSnapshot } from '@/data/queries';
import type { Snapshot } from '@/data/repositories';
import { accountBalance, openingForBalance } from '@/domain/accounts';
import { appendKeypadKey, inputToMinor, minorToInput } from '@/domain/money';
import type { Account, AccountType } from '@/domain/types';
import { AmountDisplay, ChoiceRow, SaveBar, TextField } from '@/features/add/form-parts';
import { describeTransaction } from '@/features/transactions/describe';
import { it } from '@/i18n/it';
import { useDiscardGuard } from '@/services/discard-guard';
import { dayLabel, monthName } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { useTransactionFilters } from '@/state/transaction-filters';
import { layout, radius, spacing, useTheme } from '@/theme';

import { buildAccountDetail, buildAccountsOverview, type AccountRow } from './money';

const TYPES: AccountType[] = ['bank', 'ewallet', 'cash', 'credit_card', 'savings', 'other'];
const TYPE_ICONS: Record<AccountType, IconName> = {
  bank: 'Bank',
  ewallet: 'Wallet',
  cash: 'Money',
  credit_card: 'CreditCard',
  savings: 'PiggyBank',
  other: 'DotsThree',
};
const COLORS = ['blue', 'sky', 'indigo', 'teal', 'green', 'olive', 'yellow', 'orange', 'magenta', 'plum', 'slate', 'grey'];

/** An account as a small enamel sign in its colour, with the icon of its type. */
export function AccountBadge({ account, size = 32 }: { account: Pick<Account, 'type' | 'color'>; size?: number }) {
  const { lineColor } = useTheme();
  const line = lineColor(account.color);
  return (
    <View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: radius.badge, borderCurve: 'continuous', backgroundColor: line.fill, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={TYPE_ICONS[account.type]} size={Math.round(size * 0.56)} color={line.on} weight="bold" />
    </View>
  );
}

function AccountListRow({ row, currency }: { row: AccountRow; currency: string }) {
  const { colors } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const { account, balanceMinor } = row;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${account.name}, ${it.accounts.types[account.type]}, ${formatMoney(balanceMinor, currency, { masked })}`}
      feedback="dim"
      onPress={() => router.push({ pathname: '/account/[id]', params: { id: account.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
    >
      <AccountBadge account={account} />
      <View style={{ flex: 1, gap: spacing.xxs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {account.name}
        </AppText>
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {it.accounts.types[account.type]}
        </AppText>
      </View>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Money minor={balanceMinor} currency={account.currency} variant="subheadStrong" tone={account.archived ? 'secondary' : 'primary'} />
      </View>
      <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
    </PressableScale>
  );
}

/** Conti: the total, the accounts in it, the ones kept out of it, the archived ones. */
export function AccountsScreen() {
  const { data } = useSnapshot();
  if (!data) return <Screen variant="stack">{null}</Screen>;
  const overview = buildAccountsOverview(data);
  const group = (title: string, rows: AccountRow[], footer?: string) =>
    rows.length ? (
      <SettingsGroup title={title} footer={footer}>
        {rows.map((row) => (
          <AccountListRow key={row.account.id} row={row} currency={data.currency} />
        ))}
      </SettingsGroup>
    ) : null;

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="subhead" tone="secondary">
            {it.accounts.total}
          </AppText>
          <Money minor={overview.totalMinor} currency={data.currency} variant="display" centsVariant="displayCents" label={it.accounts.total} />
        </View>
        {group(it.accounts.inTotal, overview.included)}
        {group(it.accounts.outOfTotal, overview.excluded, it.accounts.outOfTotalHint)}
        {group(it.accounts.archived, overview.archived)}
        <Button label={it.accounts.add} icon="Plus" variant="secondary" onPress={() => router.push('/account-edit')} />
      </View>
    </Screen>
  );
}

/** One account: balance, this month in and out, latest movements; edit, archive, delete when unused. */
export function AccountDetailScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useSnapshot();
  const save = useSaveAccount();
  const remove = useDeleteAccount();
  const restore = useRestoreAccount();
  const showToast = useToast((s) => s.show);
  if (!data) return <Screen variant="stack">{null}</Screen>;
  const detail = buildAccountDetail(data, id);
  if (!detail) {
    return (
      <Screen variant="stack">
        <AppText variant="title3">{it.accounts.detail.notFound}</AppText>
      </Screen>
    );
  }
  const { account } = detail;
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const accounts = new Map(data.accounts.map((a) => [a.id, a.name]));

  const toggleArchive = () => {
    const archived = !account.archived;
    haptics.light();
    save.mutate(
      { ...account, archived },
      {
        onSuccess: () =>
          showToast({
            text: archived ? it.accounts.detail.archivedToast : it.accounts.detail.unarchivedToast,
            actionLabel: it.common.undo,
            onAction: () => save.mutate({ ...account }),
          }),
      },
    );
  };
  const onDelete = () => {
    haptics.medium();
    remove.mutate(account.id, {
      onSuccess: () => {
        router.back();
        showToast({
          text: it.accounts.detail.deletedToast,
          actionLabel: it.common.undo,
          onAction: () => restore.mutate(account.id, { onSuccess: () => showToast({ text: it.accounts.detail.restoredToast }) }),
        });
      },
    });
  };
  const showAll = () => {
    const filters = useTransactionFilters.getState();
    filters.resetAll();
    filters.toggleAccount(account.id);
    router.navigate('/transactions');
  };

  return (
    <Screen variant="stack">
      <Stack.Screen options={{ title: account.name }} />
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <AccountBadge account={account} size={28} />
            <AppText variant="callout" tone="secondary" style={{ flexShrink: 1 }}>
              {[it.accounts.types[account.type], account.archived ? it.accounts.archivedTag : !account.includeInTotal ? it.accounts.outOfTotal.toLowerCase() : null]
                .filter(Boolean)
                .join(' · ')}
            </AppText>
          </View>
          <Money minor={detail.balanceMinor} currency={account.currency} variant="display" centsVariant="displayCents" label={it.accounts.detail.balance} />
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <View style={{ gap: spacing.xxs }}>
              <AppText variant="footnote" tone="secondary">
                {`${it.accounts.detail.in} ${it.accounts.detail.thisMonth(monthName(data.today)).toLowerCase()}`}
              </AppText>
              <Money minor={detail.month.inMinor} currency={account.currency} variant="subheadStrong" sign="income" />
            </View>
            <View style={{ gap: spacing.xxs }}>
              <AppText variant="footnote" tone="secondary">
                {`${it.accounts.detail.out} ${it.accounts.detail.thisMonth(monthName(data.today)).toLowerCase()}`}
              </AppText>
              <Money minor={detail.month.outMinor} currency={account.currency} variant="subheadStrong" />
            </View>
          </View>
          {account.archived ? (
            <AppText variant="footnote" tone="secondary">
              {it.accounts.detail.archivedNote}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: spacing.xs }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.accounts.detail.movements}
          </AppText>
          {detail.movements.length === 0 ? (
            <AppText variant="subhead" tone="secondary">
              {it.accounts.detail.noMovements}
            </AppText>
          ) : (
            detail.movements.map((tx, i) => (
              <StopRow
                key={tx.id}
                tx={tx}
                category={tx.categoryId ? categories.get(tx.categoryId) : undefined}
                subtitle={`${dayLabel(tx.date, data.today)} · ${describeTransaction(tx, {
                  categoryName: tx.categoryId ? categories.get(tx.categoryId)?.name : undefined,
                  accountName: accounts.get(tx.accountId),
                  toAccountName: tx.toAccountId ? accounts.get(tx.toAccountId) : undefined,
                })}`}
                currency={data.currency}
                meId={data.meId}
                first={i === 0}
                last={i === detail.movements.length - 1}
                onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
              />
            ))
          )}
          {detail.movementCount > detail.movements.length ? (
            <PressableScale accessibilityRole="link" feedback="dim" onPress={showAll} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' }}>
              <AppText variant="subheadStrong">{it.accounts.detail.allMovements(detail.movementCount)}</AppText>
              <Icon name="CaretRight" size={14} color={colors.ink} weight="bold" />
            </PressableScale>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label={it.accounts.detail.edit} icon="PencilSimple" variant="secondary" stacked onPress={() => router.push({ pathname: '/account-edit', params: { id: account.id } })} style={{ flex: 1 }} />
            <Button
              label={account.archived ? it.accounts.detail.unarchive : it.accounts.detail.archive}
              icon={account.archived ? 'ArrowUUpLeft' : 'Archive'}
              variant="secondary"
              stacked
              onPress={toggleArchive}
              style={{ flex: 1 }}
            />
            {detail.canDelete ? <Button label={it.accounts.detail.delete} icon="Trash" variant="destructive" stacked onPress={onDelete} style={{ flex: 1 }} /> : null}
          </View>
          {detail.canDelete ? null : (
            <AppText variant="footnote" tone="tertiary">
              {it.accounts.detail.deleteNote}
            </AppText>
          )}
        </View>
      </View>
    </Screen>
  );
}

/** New account or changes to one. The balance is today's: correcting it moves the opening balance, never the movements. */
export function AccountForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useSnapshot();
  if (!data) return <View style={{ flex: 1 }} />;
  const editing = id ? data.accounts.find((a) => a.id === id) : undefined;
  return <AccountFormBody key={editing?.id ?? 'new'} data={data} editing={editing} />;
}

function AccountFormBody({ data, editing }: { data: Snapshot; editing?: Account }) {
  const { colors } = useTheme();
  const save = useSaveAccount();
  const showToast = useToast((s) => s.show);
  const current = editing ? accountBalance(editing, data.transactions, data.meId) : 0;

  const [name, setName] = useState(editing?.name ?? '');
  const [type, setType] = useState<AccountType>(editing?.type ?? 'bank');
  const [color, setColor] = useState(editing?.color ?? 'teal');
  const [input, setInput] = useState(editing ? minorToInput(Math.abs(current)) : '');
  const [negative, setNegative] = useState(current < 0);
  const [includeInTotal, setIncludeInTotal] = useState(editing?.includeInTotal ?? true);
  const allowLeave = useDiscardGuard({ name, type, color, input, negative, includeInTotal });

  const balanceMinor = (negative ? -1 : 1) * inputToMinor(input);
  const missing = !name.trim() ? it.accounts.form.typeName : null;

  const onSave = () => {
    if (missing || save.isPending) return;
    const fields = { name: name.trim(), type, color, includeInTotal };
    const draft = editing
      ? { ...editing, ...fields, openingBalanceMinor: openingForBalance(editing, data.transactions, data.meId, balanceMinor) }
      : {
          ...fields,
          currency: data.currency,
          openingBalanceMinor: balanceMinor,
          archived: false,
          sortOrder: Math.max(-1, ...data.accounts.map((a) => a.sortOrder)) + 1,
        };
    save.mutate(draft, {
      onSuccess: () => {
        haptics.success();
        allowLeave();
        router.back();
        showToast({ text: it.accounts.form.saved });
      },
    });
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={editing ? it.accounts.form.editTitle : it.accounts.form.newTitle} left={{ label: it.common.cancel, onPress: () => router.back() }} />
      <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md, paddingBottom: spacing.md }} keyboardShouldPersistTaps="handled">
        <AmountDisplay input={input} label={name || it.accounts.form.balance} caption={it.accounts.form.balance} />
        <ChoiceRow label={it.accounts.form.balance}>
          {([false, true] as const).map((value) => (
            <Chip
              key={String(value)}
              label={value ? it.accounts.form.sign.negative : it.accounts.form.sign.positive}
              selected={negative === value}
              onPress={() => {
                haptics.selection();
                setNegative(value);
              }}
            />
          ))}
        </ChoiceRow>
        <TextField label={it.accounts.form.name} value={name} onChangeText={setName} placeholder={it.accounts.form.namePlaceholder} />
        <ChoiceRow label={it.accounts.form.type}>
          {TYPES.map((t) => (
            <Chip
              key={t}
              label={it.accounts.types[t]}
              selected={t === type}
              leading={<Icon name={TYPE_ICONS[t]} size={16} color={t === type ? colors.onInk : colors.ink} />}
              onPress={() => {
                haptics.selection();
                setType(t);
              }}
            />
          ))}
        </ChoiceRow>
        <ColorPicker label={it.accounts.form.color} keys={COLORS} value={color} onChange={setColor} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 }}>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <AppText variant="body">{it.accounts.form.inTotal}</AppText>
            <AppText variant="footnote" tone="secondary">
              {it.accounts.form.inTotalHint}
            </AppText>
          </View>
          <ThemedSwitch
            accessibilityLabel={it.accounts.form.inTotal}
            value={includeInTotal}
            onValueChange={(value) => {
              haptics.selection();
              setIncludeInTotal(value);
            }}
          />
        </View>
        {editing ? (
          <AppText variant="footnote" tone="tertiary">
            {it.accounts.form.correction}
          </AppText>
        ) : null}
      </ScrollView>
      <SaveBar
        onKey={(key) => setInput((value) => appendKeypadKey(value, key))}
        onClear={() => setInput('')}
        label={missing ?? (editing ? it.add.saveChanges : it.add.save)}
        ready={!missing}
        busy={save.isPending}
        onSave={onSave}
      />
      <ToastHost top={60} />
    </View>
  );
}
