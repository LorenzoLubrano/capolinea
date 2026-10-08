import { View } from 'react-native';

import { Chip } from '@/components/chip';
import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsSwitchRow } from '@/components/settings-group';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings, type NotificationRules } from '@/state/settings';
import { radius, shadows, spacing, useTheme } from '@/theme';

import { notificationPreview, type NotificationRule } from './notification-preview';

const ORDER: NotificationRule[] = ['budgetNear', 'budgetOver', 'subscriptionSoon', 'chargeCreated', 'largeExpense', 'eveningReminder', 'weeklySummary', 'monthlySummary', 'goals'];

/** A notification drawn like the phone shows it, so the user sees what a rule would send. */
function NotificationPreview({ rule }: { rule: NotificationRule }) {
  const { colors } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const threshold = useSettings((s) => s.notifications.budgetNearThreshold);
  const { title, body } = notificationPreview(rule, { masked, threshold });
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="subheadStrong" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
        {it.notificationSettings.preview}
      </AppText>
      <View
        accessible
        accessibilityLabel={`${title}. ${body}`}
        style={{ flexDirection: 'row', gap: spacing.smd, padding: spacing.md, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: colors.surface, boxShadow: shadows.floating }}
      >
        <View style={{ width: 36, height: 36, borderRadius: radius.badge + 2, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="badge" tone="onInk">
            S
          </AppText>
        </View>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText variant="caption" tone="secondary">
              {it.notificationSettings.previewApp}
            </AppText>
            <AppText variant="caption" tone="tertiary">
              {it.notificationSettings.now}
            </AppText>
          </View>
          <AppText variant="subheadStrong">{title}</AppText>
          <AppText variant="subhead">{body}</AppText>
        </View>
      </View>
    </View>
  );
}

function Options<T extends number>({ values, value, label, onChange }: { values: T[]; value: T; label: (v: T) => string; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {values.map((v) => (
        <Chip
          key={v}
          label={label(v)}
          selected={v === value}
          onPress={() => {
            haptics.selection();
            onChange(v);
          }}
        />
      ))}
    </View>
  );
}

/** Notifiche: local rules, each with its threshold, and a preview of what they send. */
export function NotificationsScreen() {
  const rules = useSettings((s) => s.notifications);
  const set = useSettings((s) => s.setNotifications);
  const first = ORDER.find((rule) => rules[rule]) ?? 'budgetNear';
  const row = (rule: NotificationRule, children?: React.ReactNode) => (
    <SettingsSwitchRow
      key={rule}
      title={it.notificationSettings.rules[rule]}
      hint={it.notificationSettings.hints[rule]}
      value={rules[rule]}
      onValueChange={(on) => set({ [rule]: on } as Partial<NotificationRules>)}
    >
      {children}
    </SettingsSwitchRow>
  );

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <NotificationPreview rule={first} />
        <SettingsGroup title={it.notificationSettings.groups.budget}>
          {row(
            'budgetNear',
            <Options values={[70, 80, 90]} value={rules.budgetNearThreshold} label={(v) => `${v}%`} onChange={(v) => set({ budgetNearThreshold: v })} />,
          )}
          {row('budgetOver')}
        </SettingsGroup>
        <SettingsGroup title={it.notificationSettings.groups.subscriptions}>
          {row(
            'subscriptionSoon',
            <Options values={[1, 2, 3]} value={rules.subscriptionDaysBefore} label={it.notificationSettings.daysBefore} onChange={(v) => set({ subscriptionDaysBefore: v })} />,
          )}
          {row('chargeCreated')}
        </SettingsGroup>
        <SettingsGroup title={it.notificationSettings.groups.spending}>
          {row(
            'largeExpense',
            <Options
              values={[5000, 10000, 20000]}
              value={rules.largeExpenseMinor}
              label={(v) => it.notificationSettings.above(formatMoney(v, 'EUR', { wholeUnits: true }))}
              onChange={(v) => set({ largeExpenseMinor: v })}
            />,
          )}
          {row('eveningReminder')}
        </SettingsGroup>
        <SettingsGroup title={it.notificationSettings.groups.summaries}>
          {row('weeklySummary')}
          {row('monthlySummary')}
        </SettingsGroup>
        <SettingsGroup title={it.notificationSettings.groups.goals} footer={it.notificationSettings.footer}>
          {row('goals')}
        </SettingsGroup>
      </View>
    </Screen>
  );
}
