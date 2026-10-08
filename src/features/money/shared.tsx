import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Calendar } from '@/components/calendar';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SettingsGroup } from '@/components/settings-group';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useAddPerson, useDeletePerson, useRestorePerson, useSettleWith, useSnapshot, useUndoSettle, useUpdatePerson } from '@/data/queries';
import type { Snapshot } from '@/data/repositories';
import { openItems } from '@/domain/splits';
import type { Person, Transaction } from '@/domain/types';
import { ChoiceRow, TextField } from '@/features/add/form-parts';
import { it } from '@/i18n/it';
import { dayLabel } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, radius, spacing, useTheme } from '@/theme';

import { buildPersonDetail, buildSharedOverview } from './money';

/** A person as a round initial: people are not categories, so never a line badge. */
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={{ width: size, height: size, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}
    >
      <AppText variant="bodyStrong" style={{ fontSize: Math.round(size * 0.42) }}>
        {name.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
}

/** "ti deve 30,00 €", "gli devi 12,00 €", "Siete pari". */
function balanceWords(balanceMinor: number, money: (minor: number) => string): string {
  if (balanceMinor > 0) return it.shared.owesYou(money(balanceMinor));
  if (balanceMinor < 0) return it.shared.youOwe(money(-balanceMinor));
  return it.shared.even;
}

/** Spese condivise: what others owe and what the user owes, then the people. */
export function SharedScreen() {
  const { colors } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const { data } = useSnapshot();
  if (!data) return <Screen variant="stack">{null}</Screen>;
  const overview = buildSharedOverview(data);
  const money = (minor: number) => formatMoney(minor, data.currency, { masked });

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', gap: spacing.lg }}>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <AppText variant="subhead" tone="secondary">
              {it.shared.owedToMe}
            </AppText>
            <Money minor={overview.owedToMeMinor} currency={data.currency} variant="figure" label={it.shared.owedToMe} />
          </View>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <AppText variant="subhead" tone="secondary">
              {it.shared.iOwe}
            </AppText>
            <Money minor={overview.iOweMinor} currency={data.currency} variant="figure" label={it.shared.iOwe} />
          </View>
        </View>
        <AppText variant="footnote" tone="secondary">
          {it.shared.hint}
        </AppText>
        {overview.people.length === 0 ? (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="title3">{it.shared.empty.title}</AppText>
            <AppText tone="secondary">{it.shared.empty.body}</AppText>
          </View>
        ) : (
          <SettingsGroup title={it.shared.people}>
            {overview.people.map(({ person, balanceMinor }) => (
              <PressableScale
                key={person.id}
                accessibilityRole="button"
                accessibilityLabel={`${person.name}, ${balanceWords(balanceMinor, money)}`}
                feedback="dim"
                onPress={() => router.push({ pathname: '/person/[id]', params: { id: person.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
              >
                <Avatar name={person.name} />
                <View style={{ flex: 1, gap: spacing.xxs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                  <AppText variant="bodyStrong">{person.name}</AppText>
                  <AppText variant="footnote" tone="secondary">
                    {balanceWords(balanceMinor, money)}
                  </AppText>
                </View>
                <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
              </PressableScale>
            ))}
          </SettingsGroup>
        )}
        <Button label={it.shared.add} icon="UserPlus" variant="secondary" onPress={() => router.push('/person-edit')} />
      </View>
    </Screen>
  );
}

/** An open split with this person: what it was, when, and whose share is due. */
function OpenItemRow({ tx, amountMinor, data }: { tx: Transaction; amountMinor: number; data: Snapshot }) {
  const { colors } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const title = tx.description ?? tx.merchant ?? '';
  const share = amountMinor > 0 ? it.shared.person.theirShare : it.shared.person.yourShare;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${dayLabel(tx.date, data.today)}, ${share} ${formatMoney(Math.abs(amountMinor), data.currency, { masked })}`}
      feedback="dim"
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 60, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
    >
      <View style={{ flex: 1, gap: spacing.xxs, paddingVertical: spacing.sm }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="footnote" tone="secondary">
          {dayLabel(tx.date, data.today)}
        </AppText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: spacing.xxs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Money minor={Math.abs(amountMinor)} currency={data.currency} variant="subheadStrong" />
        <AppText variant="caption" tone="tertiary">
          {share}
        </AppText>
      </View>
    </PressableScale>
  );
}

/** One person: the balance in words, what is open, what is already settled; settle, rename, delete. */
export function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useSnapshot();
  const remove = useDeletePerson();
  const restore = useRestorePerson();
  const showToast = useToast((s) => s.show);
  if (!data) return <Screen variant="stack">{null}</Screen>;
  const detail = buildPersonDetail(data, id);
  if (!detail) {
    return (
      <Screen variant="stack">
        <AppText variant="title3">{it.shared.person.notFound}</AppText>
      </Screen>
    );
  }
  const { person, balanceMinor } = detail;
  const heading = balanceMinor > 0 ? it.shared.person.owesYou(person.name) : balanceMinor < 0 ? it.shared.person.youOwe(person.name) : it.shared.person.even(person.name);

  const onDelete = () => {
    haptics.medium();
    remove.mutate(person.id, {
      onSuccess: () => {
        router.back();
        showToast({
          text: it.shared.person.deletedToast,
          actionLabel: it.common.undo,
          onAction: () => restore.mutate(person.id, { onSuccess: () => showToast({ text: it.shared.person.restoredToast }) }),
        });
      },
    });
  };

  return (
    <Screen variant="stack">
      <Stack.Screen options={{ title: person.name }} />
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="callout" tone="secondary">
            {heading}
          </AppText>
          {balanceMinor !== 0 ? <Money minor={Math.abs(balanceMinor)} currency={data.currency} variant="display" centsVariant="displayCents" label={heading} /> : null}
          {detail.open.length ? (
            <Button label={it.shared.person.settle} icon="Check" onPress={() => router.push({ pathname: '/settle', params: { person: person.id } })} />
          ) : null}
        </View>

        {detail.open.length ? (
          <View style={{ gap: spacing.xs }}>
            <AppText variant="title3" accessibilityRole="header">
              {it.shared.person.open}
            </AppText>
            {detail.open.map((item) => (
              <OpenItemRow key={item.tx.id} tx={item.tx} amountMinor={item.amountMinor} data={data} />
            ))}
          </View>
        ) : null}

        <View style={{ gap: spacing.xs }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.shared.person.history}
          </AppText>
          {detail.settled.length === 0 ? (
            <AppText variant="subhead" tone="secondary">
              {it.shared.person.noHistory}
            </AppText>
          ) : (
            detail.settled.map((tx) => <SettledRow key={tx.id} tx={tx} data={data} />)
          )}
        </View>

        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button label={it.shared.person.rename} icon="PencilSimple" variant="secondary" onPress={() => router.push({ pathname: '/person-edit', params: { id: person.id } })} style={{ flex: 1 }} />
            {detail.canDelete ? <Button label={it.shared.person.delete} icon="Trash" variant="destructive" onPress={onDelete} style={{ flex: 1 }} /> : null}
          </View>
          {detail.canDelete ? null : (
            <AppText variant="footnote" tone="tertiary">
              {it.shared.person.deleteNote}
            </AppText>
          )}
        </View>
      </View>
    </Screen>
  );
}

function SettledRow({ tx, data }: { tx: Transaction; data: Snapshot }) {
  const { colors } = useTheme();
  const title = tx.description ?? tx.merchant ?? '';
  return (
    <PressableScale
      accessibilityRole="button"
      feedback="dim"
      onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 52, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
    >
      <Icon name={tx.settlementWith ? 'HandCoins' : 'Check'} size={16} color={colors.inkSecondary} />
      <View style={{ flex: 1, gap: spacing.xxs, paddingVertical: spacing.sm }}>
        <AppText variant="body" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="footnote" tone="secondary">
          {dayLabel(tx.date, data.today)}
        </AppText>
      </View>
      <Money minor={tx.amountMinor} currency={data.currency} variant="subhead" tone="secondary" />
    </PressableScale>
  );
}

/** New person, or a new name for one. */
export function PersonForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useSnapshot();
  if (!data) return <View style={{ flex: 1 }} />;
  const editing = id ? data.people.find((p) => p.id === id) : undefined;
  return <PersonFormBody key={editing?.id ?? 'new'} editing={editing} />;
}

function PersonFormBody({ editing }: { editing?: Person }) {
  const add = useAddPerson();
  const update = useUpdatePerson();
  const showToast = useToast((s) => s.show);
  const [name, setName] = useState(editing?.name ?? '');
  const busy = add.isPending || update.isPending;

  const onSave = () => {
    if (busy) return;
    if (!name.trim()) {
      haptics.warning();
      return;
    }
    const done = () => {
      haptics.success();
      router.back();
      showToast({ text: it.shared.form.saved });
    };
    if (editing) update.mutate({ id: editing.id, name: name.trim() }, { onSuccess: done });
    else add.mutate(name.trim(), { onSuccess: done });
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader
        title={editing ? it.shared.form.editTitle : it.shared.form.newTitle}
        left={{ label: it.common.cancel, onPress: () => router.back() }}
        right={{ label: it.shared.form.save, onPress: onSave }}
      />
      <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md }}>
        <TextField label={it.shared.form.name} value={name} onChangeText={setName} placeholder={it.shared.form.namePlaceholder} autoFocus />
      </View>
    </View>
  );
}

/** Evening out with one person: who pays whom, optionally recorded on an account so its balance stays right. */
export function SettleSheet() {
  const { person: personId } = useLocalSearchParams<{ person: string }>();
  const { data } = useSnapshot();
  if (!data) return <View style={{ flex: 1 }} />;
  const person = data.people.find((p) => p.id === personId);
  if (!person) return <View style={{ flex: 1 }} />;
  return <SettleBody key={person.id} data={data} person={person} />;
}

function SettleBody({ data, person }: { data: Snapshot; person: Person }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const masked = useSettings((s) => s.privacy);
  const settle = useSettleWith();
  const undo = useUndoSettle();
  const showToast = useToast((s) => s.show);
  const items = openItems(data.transactions, data.meId, person.id);
  const amountMinor = items.reduce((sum, i) => sum + i.amountMinor, 0);
  const accounts = data.accounts.filter((a) => !a.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  // The account of the latest split the user paid is the likeliest place for the money.
  const likely = items.find((i) => i.amountMinor > 0)?.tx.accountId ?? accounts[0]?.id;

  const [record, setRecord] = useState(amountMinor !== 0);
  const [accountId, setAccountId] = useState(likely);
  const [date, setDate] = useState(data.today);
  const [picking, setPicking] = useState(false);
  const money = formatMoney(Math.abs(amountMinor), data.currency, { masked });
  const sentence = amountMinor > 0 ? it.shared.settle.theyPay(person.name, money) : amountMinor < 0 ? it.shared.settle.youPay(person.name, money) : it.shared.settle.even;

  const onConfirm = () => {
    if (settle.isPending) return;
    settle.mutate(
      { personId: person.id, date, accountId: record && amountMinor !== 0 ? accountId : undefined, description: it.shared.settle.description(person.name) },
      {
        onSuccess: (result) => {
          haptics.success();
          router.back();
          showToast({
            text: it.shared.settle.done(person.name),
            actionLabel: it.common.undo,
            onAction: () => undo.mutate(result, { onSuccess: () => showToast({ text: it.shared.settle.undone }) }),
          });
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={it.shared.settle.title} left={{ label: it.common.cancel, onPress: () => router.back() }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.lg, gap: spacing.lg }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="title2">{sentence}</AppText>
          <AppText variant="subhead" tone="secondary">
            {it.shared.settle.items(items.length)}
          </AppText>
        </View>
        {amountMinor !== 0 ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56 }}>
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <AppText variant="body">{it.shared.settle.record}</AppText>
                <AppText variant="footnote" tone="secondary">
                  {it.shared.settle.recordHint}
                </AppText>
              </View>
              <Switch
                accessibilityLabel={it.shared.settle.record}
                value={record}
                onValueChange={(value) => {
                  haptics.selection();
                  setRecord(value);
                }}
                trackColor={{ true: colors.ink, false: colors.track }}
                thumbColor={colors.surface}
              />
            </View>
            {record ? (
              <>
                <ChoiceRow label={it.shared.settle.account}>
                  {accounts.map((a) => (
                    <Chip
                      key={a.id}
                      label={a.name}
                      selected={a.id === accountId}
                      onPress={() => {
                        haptics.selection();
                        setAccountId(a.id);
                      }}
                    />
                  ))}
                </ChoiceRow>
                <ChoiceRow label={it.shared.settle.date}>
                  <Chip
                    label={dayLabel(date, data.today)}
                    selected={picking}
                    leading={<Icon name="CalendarBlank" size={16} color={picking ? colors.onInk : colors.ink} />}
                    onPress={() => setPicking((p) => !p)}
                  />
                </ChoiceRow>
                {picking ? (
                  <Calendar
                    value={date}
                    today={data.today}
                    onChange={(day) => {
                      setDate(day);
                      setPicking(false);
                    }}
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        <Button label={it.shared.settle.confirm} busy={settle.isPending} onPress={onConfirm} />
      </View>
      <ToastHost bottom={88} />
    </View>
  );
}
