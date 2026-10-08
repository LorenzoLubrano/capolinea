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
import { radius, spacing, useTheme } from '@/theme';

/** Profilo, opened from the avatar on the Home. Entries arrive here block by block. */
export function ProfileScreen() {
  const { colors } = useTheme();
  const { data } = useSnapshot();
  const masked = useSettings((s) => s.privacy);
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
                {it.profile.localOnly}
              </AppText>
            </View>
          </View>
        </View>

        <SettingsGroup title={it.profile.money}>
          <SettingsRow icon="Wallet" title={it.profile.accounts} hint={it.profile.accountsHint(accounts)} onPress={() => router.push('/accounts')} />
          <SettingsRow icon="Tag" title={it.profile.categories} hint={it.profile.categoriesHint(expenseCategories, incomeCategories)} onPress={() => router.push('/categories')} />
          <SettingsRow icon="Users" title={it.profile.shared} hint={sharedHint} onPress={() => router.push('/shared')} />
        </SettingsGroup>

        <SettingsGroup title={it.profile.preferences} footer={it.profile.comingSoon}>
          <SettingsRow icon="Palette" title={it.profile.appearance} hint={it.profile.appearanceHint} onPress={() => router.push('/settings/appearance')} />
        </SettingsGroup>
      </View>
    </Screen>
  );
}
