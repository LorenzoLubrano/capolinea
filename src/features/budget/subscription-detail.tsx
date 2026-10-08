import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { SheetHeader } from '@/components/sheet-header';
import { StopRow } from '@/components/stop-row';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useDeleteSubscription, useRestoreSubscription, useSnapshot, useUpdateSubscription } from '@/data/queries';
import { monthlyEquivalent, yearlyEquivalent } from '@/domain/breakdown';
import { it } from '@/i18n/it';
import { fullDate } from '@/services/format/dates';
import { frequencyLabel } from '@/services/format/frequency';
import { haptics } from '@/services/haptics';
import { useToast } from '@/state/toast';
import { layout, spacing, useTheme } from '@/theme';

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

/** One subscription: price, rhythm, next charge, the charges it created. Pause, edit, delete. */
export function SubscriptionDetail() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useSnapshot();
  const update = useUpdateSubscription();
  const remove = useDeleteSubscription();
  const restore = useRestoreSubscription();
  const showToast = useToast((s) => s.show);

  const subscription = data?.subscriptions.find((s) => s.id === id);
  if (!data) return <View style={{ flex: 1 }} />;
  if (!subscription) {
    return (
      <View style={{ flex: 1 }}>
        <SheetHeader title="" left={{ label: it.detail.close, onPress: () => router.back() }} />
        <View style={{ padding: spacing.gutter, gap: spacing.sm }}>
          <AppText variant="title3">{it.detail.notFound.title}</AppText>
        </View>
      </View>
    );
  }

  const category = data.categories.find((c) => c.id === subscription.categoryId);
  const account = data.accounts.find((a) => a.id === subscription.accountId);
  const charges = data.transactions
    .filter((t) => t.subscriptionId === subscription.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const togglePause = () => {
    haptics.light();
    update.mutate(
      { id: subscription.id, changes: { active: !subscription.active } },
      { onSuccess: () => showToast({ text: subscription.active ? it.subscriptions.detail.paused : it.subscriptions.detail.resumed }) },
    );
  };

  const onDelete = () => {
    haptics.medium();
    remove.mutate(subscription.id, {
      onSuccess: () => {
        router.back();
        showToast({
          text: it.subscriptions.detail.deleted,
          actionLabel: it.add.undo,
          onAction: () => restore.mutate(subscription.id, { onSuccess: () => showToast({ text: it.subscriptions.detail.restored }) }),
        });
      },
    });
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={it.add.subscription} left={{ label: it.detail.close, onPress: () => router.back() }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <LineBadge color={category?.color ?? 'grey'} name={subscription.name} size={28} />
            <AppText variant="callout" tone="secondary">
              {category?.name}
            </AppText>
          </View>
          <AppText variant="title2" accessibilityRole="header">
            {subscription.name}
          </AppText>
          <Money minor={subscription.amountMinor} currency={subscription.currency} variant="display" centsVariant="displayCents" label={subscription.name} />
          <AppText variant="subhead" tone="secondary">
            {frequencyLabel(subscription.frequency)}
          </AppText>
        </View>

        <View>
          <Row label={it.subscriptions.detail.nextCharge}>
            <AppText variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
              {subscription.active ? fullDate(subscription.nextBillingDate) : it.subscriptions.paused}
            </AppText>
          </Row>
          <Row label={it.detail.account}>
            <AppText variant="bodyStrong">{account?.name}</AppText>
          </Row>
          <Row label={it.subscriptions.detail.monthly}>
            <Money minor={monthlyEquivalent(subscription)} currency={subscription.currency} variant="bodyStrong" />
          </Row>
          <Row label={it.subscriptions.detail.yearly}>
            <Money minor={yearlyEquivalent(subscription)} currency={subscription.currency} variant="bodyStrong" />
          </Row>
          <Row label={it.subscriptions.detail.since}>
            <AppText variant="bodyStrong">{fullDate(subscription.startDate)}</AppText>
          </Row>
        </View>

        <AppText variant="subhead" tone="secondary">
          {subscription.active ? it.subscriptions.detail.rule : it.subscriptions.detail.pausedNote}
        </AppText>

        <View style={{ gap: spacing.xs }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.subscriptions.detail.charges}
          </AppText>
          {charges.length === 0 ? (
            <AppText variant="subhead" tone="secondary">
              {it.subscriptions.detail.noCharges}
            </AppText>
          ) : (
            charges.map((tx, i) => (
              <StopRow
                key={tx.id}
                tx={tx}
                category={category}
                subtitle={fullDate(tx.date)}
                currency={data.currency}
                meId={data.meId}
                first={i === 0}
                last={i === charges.length - 1}
                onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: tx.id } })}
              />
            ))
          )}
        </View>
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        <Button
          label={it.detail.edit}
          icon="PencilSimple"
          variant="secondary"
          stacked
          onPress={() => router.push({ pathname: '/add-subscription', params: { id: subscription.id } })}
          style={{ flex: 1 }}
        />
        <Button
          label={subscription.active ? it.subscriptions.detail.pause : it.subscriptions.detail.resume}
          icon={subscription.active ? 'Pause' : 'Play'}
          variant="secondary"
          stacked
          busy={update.isPending}
          onPress={togglePause}
          style={{ flex: 1 }}
        />
        <Button label={it.detail.delete} icon="Trash" variant="destructive" stacked busy={remove.isPending} onPress={onDelete} style={{ flex: 1 }} />
      </View>
      <ToastHost bottom={96} />
    </View>
  );
}
