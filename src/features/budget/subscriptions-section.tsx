import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Calendar } from '@/components/calendar';
import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import type { Snapshot } from '@/data/repositories';
import { subscriptionTotals } from '@/domain/breakdown';
import { addMonthsClamped, monthStart } from '@/domain/dates';
import { upcomingCharges } from '@/domain/subscriptions';
import type { LocalDate, Subscription } from '@/domain/types';
import { it } from '@/i18n/it';
import { dayLabel, shortDate } from '@/services/format/dates';
import { frequencyLabel } from '@/services/format/frequency';
import { formatMoney } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

function SubscriptionRow({ subscription, color, currency, today }: { subscription: Subscription; color: string; currency: string; today: LocalDate }) {
  const { colors } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const when = subscription.active
    ? `${frequencyLabel(subscription.frequency)} · ${it.subscriptions.next(subscription.nextBillingDate === today ? it.dates.today.toLowerCase() : shortDate(subscription.nextBillingDate))}`
    : it.subscriptions.paused;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${subscription.name}, ${formatMoney(subscription.amountMinor, currency, { masked })}, ${when}`}
      feedback="dim"
      onPress={() => router.push({ pathname: '/subscription/[id]', params: { id: subscription.id } })}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, paddingVertical: spacing.smd, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
    >
      <View style={{ opacity: subscription.active ? 1 : 0.45 }}>
        <LineBadge color={color} name={subscription.name} size={32} />
      </View>
      <View style={{ flex: 1, gap: spacing.xxs }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {subscription.name}
        </AppText>
        <AppText variant="footnote" tone={subscription.active ? 'secondary' : 'tertiary'} numberOfLines={1}>
          {when}
        </AppText>
      </View>
      <Money minor={subscription.amountMinor} currency={currency} variant="bodyStrong" tone={subscription.active ? 'primary' : 'tertiary'} />
    </PressableScale>
  );
}

/** Abbonamenti: what they cost, when they charge, every subscription. */
export function SubscriptionsSection({ data }: { data: Snapshot }) {
  const { colors, lineColor } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const [selected, setSelected] = useState<LocalDate>(data.today);
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const colorOf = (s: Subscription) => categories.get(s.categoryId)?.color ?? 'grey';
  const totals = subscriptionTotals(data.subscriptions, data.currency);

  // Charges of the visible months (the calendar can move a few months either way).
  const charges = upcomingCharges(data.subscriptions, addMonthsClamped(monthStart(data.today), -3), addMonthsClamped(monthStart(data.today), 13));
  const markers: Record<LocalDate, string[]> = {};
  for (const c of charges) (markers[c.date] ??= []).push(lineColor(colorOf(c.subscription)).fill);
  const ofDay = charges.filter((c) => c.date === selected);
  const ordered = [...data.subscriptions].sort(
    (a, b) => Number(b.active) - Number(a.active) || a.nextBillingDate.localeCompare(b.nextBillingDate) || a.name.localeCompare(b.name),
  );

  if (data.subscriptions.length === 0) {
    return (
      <View style={{ gap: spacing.sm }}>
        <AppText variant="title3">{it.subscriptions.empty.title}</AppText>
        <AppText tone="secondary">{it.subscriptions.empty.body}</AppText>
        <Button label={it.subscriptions.add} icon="Plus" onPress={() => router.push('/add-subscription')} style={{ alignSelf: 'flex-start' }} />
      </View>
    );
  }

  return (
    <View style={{ gap: spacing.xl }}>
      <View style={{ gap: spacing.xs }}>
        <AppText variant="subhead" tone="secondary">
          {it.subscriptions.perMonth}
        </AppText>
        <Money minor={totals.monthlyMinor} currency={data.currency} variant="display" centsVariant="displayCents" label={it.subscriptions.perMonth} />
        <AppText variant="subhead" tone="secondary">
          {`${it.subscriptions.perYear(formatMoney(totals.yearlyMinor, data.currency, { masked, wholeUnits: true }))} · ${it.subscriptions.active(totals.activeCount)}`}
        </AppText>
      </View>

      <View style={{ gap: spacing.sm }}>
        <AppText variant="title3" accessibilityRole="header">
          {it.subscriptions.calendar}
        </AppText>
        <Calendar
          value={selected}
          today={data.today}
          onChange={setSelected}
          markers={markers}
          markersLabel={(n) => (n === 1 ? '1 addebito' : `${n} addebiti`)}
        />
        <View style={{ gap: spacing.xs, paddingTop: spacing.xs }}>
          <AppText variant="subheadStrong" tone="secondary">
            {it.subscriptions.onDay(dayLabel(selected, data.today).toLowerCase())}
          </AppText>
          {ofDay.length === 0 ? (
            <AppText variant="subhead" tone="tertiary">
              {it.subscriptions.noneOnDay}
            </AppText>
          ) : (
            ofDay.map((c) => (
              <PressableScale
                key={c.subscription.id}
                accessibilityRole="button"
                feedback="dim"
                onPress={() => router.push({ pathname: '/subscription/[id]', params: { id: c.subscription.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lineColor(colorOf(c.subscription)).fill }} />
                <AppText variant="body" style={{ flex: 1 }}>
                  {c.subscription.name}
                </AppText>
                <Money minor={c.subscription.amountMinor} currency={data.currency} variant="bodyStrong" />
              </PressableScale>
            ))
          )}
        </View>
      </View>

      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: spacing.md }}>
          <AppText variant="title3" accessibilityRole="header">
            {it.subscriptions.all}
          </AppText>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={it.subscriptions.add}
            feedback="dim"
            onPress={() => router.push('/add-subscription')}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingLeft: spacing.md }}
          >
            <Icon name="Plus" size={16} color={colors.ink} weight="bold" />
            <AppText variant="subheadStrong">{it.budget.add}</AppText>
          </PressableScale>
        </View>
        {ordered.map((s) => (
          <SubscriptionRow key={s.id} subscription={s} color={colorOf(s)} currency={data.currency} today={data.today} />
        ))}
      </View>
    </View>
  );
}
