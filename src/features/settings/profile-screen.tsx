import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsRow } from '@/components/settings-group';
import { AppText } from '@/components/text';
import { useSnapshot } from '@/data/queries';
import { buildSharedOverview } from '@/features/money/money';
import { it } from '@/i18n/it';
import { formatMoney } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { useSync } from '@/state/sync';
import { radius, spacing, useTheme } from '@/theme';

const RULES = ['budgetNear', 'budgetOver', 'subscriptionSoon', 'chargeCreated', 'largeExpense', 'weeklySummary', 'monthlySummary', 'eveningReminder', 'goals'] as const;

/** Profilo, opened from the avatar on the Home: the user's money, security and privacy, preferences, data. */
export function ProfileScreen() {
  const { colors } = useTheme();
  const { data } = useSnapshot();
  const masked = useSettings((s) => s.privacy);
  const pin = useSettings((s) => s.pin);
  const notifications = useSettings((s) => s.notifications);
  const syncStatus = useSync((s) => s.status);
  const name = data?.people.find((p) => p.isMe)?.name ?? '';
  const accounts = data?.accounts.filter((a) => !a.archived).length ?? 0;
  const expenseCategories = data?.categories.filter((c) => c.kind === 'expense' && !c.archived).length ?? 0;
  const incomeCategories = data?.categories.filter((c) => c.kind === 'income' && !c.archived).length ?? 0;
  const shared = data ? buildSharedOverview(data) : null;
  const money = (minor: number) => formatMoney(minor, data?.currency ?? 'EUR', { masked, wholeUnits: true });
  const sharedHint = shared
    ? [shared.owedToMeMinor ? it.shared.homeOwed(money(shared.owedToMeMinor)) : null, shared.iOweMinor ? it.shared.homeOwe(money(shared.iOweMinor)) : null]
        .filter(Boolean)
        .join(' · ') || it.profile.sharedNone
    : undefined;

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="title2" tone="onInk">
              {name.charAt(0)}
            </AppText>
          </View>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <AppText variant="title2">{name}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Icon name="DeviceMobile" size={16} color={colors.inkSecondary} />
              <AppText variant="footnote" tone="secondary" style={{ flexShrink: 1 }}>
                {syncStatus === 'off' ? it.profile.localOnly : it.sync.states.on.title}
              </AppText>
            </View>
          </View>
        </View>

        <SettingsGroup title={it.profile.money}>
          <SettingsRow icon="Wallet" title={it.profile.accounts} hint={it.profile.accountsHint(accounts)} onPress={() => router.push('/accounts')} />
          <SettingsRow icon="Tag" title={it.profile.categories} hint={it.profile.categoriesHint(expenseCategories, incomeCategories)} onPress={() => router.push('/categories')} />
          <SettingsRow icon="Users" title={it.profile.shared} hint={sharedHint} onPress={() => router.push('/shared')} />
        </SettingsGroup>

        <SettingsGroup title={it.profile.securityPrivacy}>
          <SettingsRow icon="LockSimple" title={it.profile.security} hint={it.profile.securityHint(pin !== null)} onPress={() => router.push('/settings/security')} />
          <SettingsRow icon={masked ? 'EyeSlash' : 'Eye'} title={it.profile.privacy} hint={it.profile.privacyHint(masked)} onPress={() => router.push('/settings/privacy')} />
        </SettingsGroup>

        <SettingsGroup title={it.profile.preferences}>
          <SettingsRow
            icon="Bell"
            title={it.profile.notifications}
            hint={it.profile.notificationsHint(RULES.filter((rule) => notifications[rule]).length)}
            onPress={() => router.push('/settings/notifications')}
          />
          <SettingsRow icon="Palette" title={it.profile.appearance} hint={it.profile.appearanceHint} onPress={() => router.push('/settings/appearance')} />
          <SettingsRow icon="CurrencyEur" title={it.profile.currency} hint={it.profile.currencyHint} onPress={() => router.push('/settings/currency')} />
        </SettingsGroup>

        <SettingsGroup title={it.profile.yourData}>
          <SettingsRow icon="Export" title={it.profile.export} hint={it.profile.exportHint} onPress={() => router.push('/settings/export')} />
          <SettingsRow icon={syncStatus === 'off' ? 'CloudSlash' : 'CloudCheck'} title={it.profile.sync} hint={it.sync.states[syncStatus].title} onPress={() => router.push('/settings/sync')} />
          <SettingsRow icon="Trash" title={it.profile.deleteData} destructive onPress={() => router.push('/settings/delete')} />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow icon="Info" title={it.profile.info} onPress={() => router.push('/settings/info')} />
        </SettingsGroup>
      </View>
    </Screen>
  );
}
