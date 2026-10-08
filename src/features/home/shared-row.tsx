import { router } from 'expo-router';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import type { Snapshot } from '@/data/repositories';
import { buildSharedOverview } from '@/features/money/money';
import { it } from '@/i18n/it';
import { formatMoney } from '@/services/format/money';
import { useSettings } from '@/state/settings';
import { spacing, useTheme } from '@/theme';

/** Shared expenses are secondary: one row on the Home, only while someone owes something. */
export function SharedRow({ data }: { data: Snapshot }) {
  const { colors } = useTheme();
  const masked = useSettings((s) => s.privacy);
  const { owedToMeMinor, iOweMinor } = buildSharedOverview(data);
  if (!owedToMeMinor && !iOweMinor) return null;
  const money = (minor: number) => formatMoney(minor, data.currency, { masked, wholeUnits: true });
  const parts = [owedToMeMinor ? it.shared.homeOwed(money(owedToMeMinor)) : null, iOweMinor ? it.shared.homeOwe(money(iOweMinor)) : null].filter(Boolean).join(' · ');
  return (
    <PressableScale
      accessibilityRole="button"
      feedback="dim"
      onPress={() => router.push('/shared')}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd, minHeight: 52 }}
    >
      <Icon name="Users" size={20} color={colors.ink} />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <AppText variant="subheadStrong">{it.shared.title}</AppText>
        <AppText variant="footnote" tone="secondary">
          {parts.charAt(0).toUpperCase() + parts.slice(1)}
        </AppText>
      </View>
      <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
    </PressableScale>
  );
}
