import { Platform, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsInfoRow, SettingsSwitchRow } from '@/components/settings-group';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

/** Privacy: hidden amounts, the app switcher cover, and what the app knows about the user. */
export function PrivacyScreen() {
  const { colors } = useTheme();
  const privacy = useSettings((s) => s.privacy);
  const startHidden = useSettings((s) => s.startHidden);
  const cover = useSettings((s) => s.coverInSwitcher);
  const setPrivacy = useSettings((s) => s.setPrivacy);
  const setStartHidden = useSettings((s) => s.setStartHidden);
  const setCover = useSettings((s) => s.setCoverInSwitcher);
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <SettingsGroup title={it.privacySettings.amounts}>
          <SettingsSwitchRow icon="EyeSlash" title={it.privacySettings.mode} hint={it.privacySettings.modeHint} value={privacy} onValueChange={setPrivacy} />
          <SettingsSwitchRow icon="LockSimple" title={it.privacySettings.startHidden} hint={it.privacySettings.startHiddenHint} value={startHidden} onValueChange={setStartHidden} />
        </SettingsGroup>
        <SettingsGroup title={it.privacySettings.switcher}>
          <SettingsSwitchRow
            icon="DeviceMobile"
            title={it.privacySettings.cover}
            hint={it.privacySettings.coverHint[platform]}
            value={cover}
            disabled={platform === 'web'}
            onValueChange={setCover}
          />
        </SettingsGroup>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="subheadStrong" tone="secondary" accessibilityRole="header" style={{ paddingHorizontal: spacing.xs }}>
            {it.privacySettings.promises}
          </AppText>
          {it.privacySettings.promiseList.map((line) => (
            <View key={line} style={{ flexDirection: 'row', gap: spacing.smd, paddingHorizontal: spacing.xs }}>
              <Icon name="ShieldCheck" size={20} color={colors.ink} />
              <AppText variant="subhead" style={{ flex: 1 }}>
                {line}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </Screen>
  );
}

/** Valuta e formati: one main currency and the Italian formats, shown on examples. */
export function CurrencyScreen() {
  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <SettingsGroup title={it.currencySettings.main} footer={it.currencySettings.mainHint}>
          <SettingsInfoRow icon="CurrencyEur" title={it.currencySettings.euro} />
        </SettingsGroup>
        <SettingsGroup title={it.currencySettings.formats} footer={it.currencySettings.formatsHint}>
          <SettingsInfoRow title={it.currencySettings.amount} value="1.284,62 €" />
          <SettingsInfoRow title={it.currencySettings.date} value="Sabato 24 ottobre 2026" />
          <SettingsInfoRow title={it.currencySettings.week} value={it.currencySettings.weekValue} />
          <SettingsInfoRow title={it.currencySettings.budgetMonth} value={it.currencySettings.budgetMonthValue} />
        </SettingsGroup>
      </View>
    </Screen>
  );
}
