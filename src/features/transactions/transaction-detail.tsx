import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useAddTransaction, useDeleteTransaction, useRestoreTransaction, useSnapshot } from '@/data/queries';
import type { NewTransaction, Snapshot } from '@/data/repositories';
import { refundableMinor } from '@/domain/splits';
import type { Transaction } from '@/domain/types';
import { it } from '@/i18n/it';
import { fullDate, shortDate } from '@/services/format/dates';
import { haptics } from '@/services/haptics';
import { useToast } from '@/state/toast';
import { layout, radius, spacing, useTheme } from '@/theme';

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: 48,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.hairline,
      }}
    >
      <AppText variant="callout" tone="secondary">
        {label}
      </AppText>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

function Note({ icon, title, body }: { icon: 'ArrowsClockwise' | 'Users' | 'ArrowUUpLeft'; title: ReactNode; body?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.smd, padding: spacing.md, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: colors.surfaceMuted }}>
      <Icon name={icon} size={20} color={colors.ink} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        {title}
        {body}
      </View>
    </View>
  );
}

/** What the split means for me: who paid, my share, who owes whom. */
function SplitNote({ tx, data }: { tx: Transaction; data: Snapshot }) {
  const people = new Map(data.people.map((p) => [p.id, p.name]));
  const others = (tx.split ?? []).filter((s) => s.personId !== data.meId);
  const mine = tx.split?.find((s) => s.personId === data.meId);
  const payer = tx.paidByPersonId ?? data.meId;
  const paidByMe = payer === data.meId;

  return (
    <Note
      icon="Users"
      title={<AppText variant="bodyStrong">{it.detail.splitWith(others.map((s) => people.get(s.personId)).join(', '))}</AppText>}
      body={
        <View style={{ gap: spacing.xs }}>
          <AppText variant="subhead" tone="secondary">
            {paidByMe ? it.detail.paidByMe : it.detail.paidBy(people.get(payer) ?? '')}
          </AppText>
          {mine ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="subhead">{it.detail.myShare}</AppText>
              <Money minor={mine.amountMinor} currency={tx.currency} variant="subheadStrong" />
            </View>
          ) : null}
          {(paidByMe ? others : mine && payer !== data.meId ? [{ ...mine, personId: payer }] : []).map((share) => {
            const name = people.get(share.personId) ?? '';
            return (
              <View key={share.personId} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="subhead">{paidByMe ? it.detail.owesMe(name) : it.detail.iOwe(name)}</AppText>
                {share.settled ? (
                  <AppText variant="subhead" tone="secondary">
                    {it.detail.settled}
                  </AppText>
                ) : (
                  <Money minor={share.amountMinor} currency={tx.currency} variant="subheadStrong" />
                )}
              </View>
            );
          })}
        </View>
      }
    />
  );
}

const refundsOf = (tx: Transaction, data: Snapshot) => data.transactions.filter((t) => t.refundOfId === tx.id);

function copyOf(tx: Transaction, today: string): NewTransaction {
  const {
    id: _id,
    createdAt: _created,
    updatedAt: _updated,
    deletedAt: _deleted,
    subscriptionId: _subscription,
    occurrenceDate: _occurrence,
    editedAfterGeneration: _edited,
    ...rest
  } = tx;
  return { ...rest, date: today, isRecurring: false };
}

/** One movement: what it is, where it comes from, how it counts. Edit, duplicate, delete with undo. */
export function TransactionDetail() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useSnapshot();
  const remove = useDeleteTransaction();
  const restore = useRestoreTransaction();
  const add = useAddTransaction();
  const showToast = useToast((s) => s.show);

  const tx = data?.transactions.find((t) => t.id === id);
  if (!data) return <View style={{ flex: 1 }} />;
  if (!tx) {
    return (
      <View style={{ flex: 1 }}>
        <SheetHeader title="" left={{ label: it.detail.close, onPress: () => router.back() }} />
        <View style={{ padding: spacing.gutter, gap: spacing.sm }}>
          <AppText variant="title3">{it.detail.notFound.title}</AppText>
          <AppText tone="secondary">{it.detail.notFound.body}</AppText>
        </View>
      </View>
    );
  }

  const category = data.categories.find((c) => c.id === tx.categoryId);
  const account = data.accounts.find((a) => a.id === tx.accountId);
  const toAccount = data.accounts.find((a) => a.id === tx.toAccountId);
  const subscription = data.subscriptions.find((s) => s.id === tx.subscriptionId);
  const original = tx.refundOfId ? data.transactions.find((t) => t.id === tx.refundOfId) : undefined;
  const refunds = data.transactions.filter((t) => t.refundOfId === tx.id);
  const title = tx.merchant ?? tx.description ?? category?.name ?? it.detail.types[tx.type];
  const isIn = tx.type === 'income' || tx.type === 'refund';
  const settledWith = tx.settlementWith ? data.people.find((p) => p.id === tx.settlementWith) : undefined;
  const paidBy = tx.paidByPersonId && tx.paidByPersonId !== data.meId ? data.people.find((p) => p.id === tx.paidByPersonId) : undefined;
  const baseRule = tx.settlementWith
    ? it.detail.counts.settlement(settledWith?.name ?? '')
    : tx.split
      ? paidBy
        ? it.detail.counts.splitPaidByOther(paidBy.name)
        : it.detail.counts.split
      : it.detail.counts[tx.type];
  const rule = baseRule + (refundsOf(tx, data).length ? ` ${it.detail.countsRefunded}` : '');

  const onDelete = () => {
    haptics.medium();
    remove.mutate(tx.id, {
      onSuccess: () => {
        router.back();
        showToast({
          text: it.detail.deleted,
          actionLabel: it.add.undo,
          onAction: () => restore.mutate(tx.id, { onSuccess: () => showToast({ text: it.detail.restored }) }),
        });
      },
    });
  };

  const onDuplicate = () => {
    add.mutate(copyOf(tx, data.today), {
      onSuccess: (copy) => {
        haptics.success();
        router.back();
        showToast({
          text: it.detail.duplicated,
          actionLabel: it.add.undo,
          onAction: () => remove.mutate(copy.id, { onSuccess: () => showToast({ text: it.detail.copyRemoved }) }),
        });
      },
    });
  };

  const onEdit = () => {
    const pathname = ({ expense: '/add-expense', income: '/add-income', transfer: '/add-transfer', refund: '/add-refund' } as const)[tx.type];
    router.push({ pathname, params: { id: tx.id } });
  };
  const refundable = tx.type === 'expense' && !tx.settlementWith ? refundableMinor(tx, data.transactions) : 0;

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={tx.settlementWith ? it.detail.settlementType : it.detail.types[tx.type]} left={{ label: it.detail.close, onPress: () => router.back() }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {tx.type === 'transfer' || tx.settlementWith ? (
              <View style={{ width: 28, height: 28, borderRadius: radius.badge, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={tx.settlementWith ? 'HandCoins' : 'ArrowsLeftRight'} size={16} color={colors.ink} />
              </View>
            ) : (
              <LineBadge color={category?.color ?? 'grey'} name={category?.name ?? '?'} size={28} />
            )}
            <AppText variant="callout" tone="secondary">
              {tx.type === 'transfer' ? it.detail.types.transfer : tx.settlementWith ? it.shared.title : (category?.name ?? '')}
            </AppText>
          </View>
          <AppText variant="title2" accessibilityRole="header">
            {title}
          </AppText>
          <Money
            minor={tx.amountMinor}
            currency={tx.currency}
            sign={tx.type === 'transfer' ? 'none' : isIn ? 'income' : 'expense'}
            variant="display"
            centsVariant="displayCents"
            label={title}
          />
          <AppText variant="subhead" tone="secondary">
            {fullDate(tx.date)}
          </AppText>
        </View>

        {subscription ? (
          <Note
            icon="ArrowsClockwise"
            title={<AppText variant="bodyStrong">{it.detail.fromSubscription(subscription.name)}</AppText>}
            body={
              <AppText variant="subhead" tone="secondary">
                {tx.editedAfterGeneration ? `${it.detail.fromSubscriptionBody} ${it.detail.editedAfterGeneration}` : it.detail.fromSubscriptionBody}
              </AppText>
            }
          />
        ) : null}
        {tx.split ? <SplitNote tx={tx} data={data} /> : null}
        {original ? (
          <PressableScale
            accessibilityRole="link"
            feedback="dim"
            onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: original.id } })}
          >
            <Note
              icon="ArrowUUpLeft"
              title={<AppText variant="bodyStrong">{`${it.detail.refundOf} ${original.merchant ?? ''}`}</AppText>}
              body={
                <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <AppText variant="subhead" tone="secondary">{`${shortDate(original.date)} ·`}</AppText>
                  <Money minor={original.amountMinor} currency={original.currency} variant="subhead" tone="secondary" />
                </View>
              }
            />
          </PressableScale>
        ) : null}
        {refunds.length ? (
          <Note
            icon="ArrowUUpLeft"
            title={<AppText variant="bodyStrong">{it.detail.refundedBy}</AppText>}
            body={refunds.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', gap: spacing.xs }}>
                <AppText variant="subhead" tone="secondary">{`${shortDate(r.date)} ·`}</AppText>
                <Money minor={r.amountMinor} currency={r.currency} variant="subhead" tone="secondary" />
              </View>
            ))}
          />
        ) : null}

        <View>
          {tx.type === 'transfer' ? (
            <>
              <InfoRow label={it.detail.fromAccount}>
                <AppText variant="bodyStrong">{account?.name}</AppText>
              </InfoRow>
              <InfoRow label={it.detail.toAccount}>
                <AppText variant="bodyStrong">{toAccount?.name}</AppText>
              </InfoRow>
            </>
          ) : (
            <InfoRow label={it.detail.account}>
              <AppText variant="bodyStrong">{account?.name}</AppText>
            </InfoRow>
          )}
          {category && tx.type !== 'transfer' ? (
            <InfoRow label={it.detail.category}>
              <AppText variant="bodyStrong">{category.name}</AppText>
            </InfoRow>
          ) : null}
          {tx.notes ? (
            <InfoRow label={it.detail.notes}>
              <AppText variant="body" style={{ textAlign: 'right' }}>
                {tx.notes}
              </AppText>
            </InfoRow>
          ) : null}
          {tx.tags.length ? (
            <InfoRow label={it.detail.tags}>
              <AppText variant="body">{tx.tags.map((t) => `#${t}`).join('  ')}</AppText>
            </InfoRow>
          ) : null}
        </View>

        {refundable > 0 ? (
          <PressableScale
            accessibilityRole="button"
            feedback="dim"
            onPress={() => router.push({ pathname: '/add-refund', params: { of: tx.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 52, paddingHorizontal: spacing.md, borderRadius: radius.control, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.hairline }}
          >
            <Icon name="ArrowUUpLeft" size={20} color={colors.ink} />
            <AppText variant="bodyStrong" style={{ flex: 1 }}>
              {it.detail.addRefund}
            </AppText>
            <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
          </PressableScale>
        ) : null}

        <View style={{ gap: spacing.xs }}>
          <AppText variant="subheadStrong" tone="secondary">
            {it.detail.howItCounts}
          </AppText>
          <AppText variant="subhead" tone="secondary">
            {rule}
          </AppText>
        </View>
      </ScrollView>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing.sm,
          paddingHorizontal: spacing.gutter,
          paddingTop: spacing.sm,
          paddingBottom: insets.bottom + spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.hairline,
        }}
      >
        <Button label={it.detail.edit} icon="PencilSimple" variant="secondary" stacked onPress={onEdit} style={{ flex: 1 }} />
        <Button label={it.detail.duplicate} icon="Copy" variant="secondary" stacked onPress={onDuplicate} busy={add.isPending} style={{ flex: 1 }} />
        <Button label={it.detail.delete} icon="Trash" variant="destructive" stacked onPress={onDelete} busy={remove.isPending} style={{ flex: 1 }} />
      </View>
      <ToastHost bottom={96} />
    </View>
  );
}
