import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { AppText } from '@/components/text';
import { useSnapshot } from '@/data/queries';
import { it } from '@/i18n/it';
import { radius, spacing, useTheme } from '@/theme';

import { GoalsSection } from './goals-section';
import { MonthSection } from './month-section';
import { SubscriptionsSection } from './subscriptions-section';

type Section = 'month' | 'subscriptions' | 'goals';
const SECTIONS: Section[] = ['month', 'subscriptions', 'goals'];

/** Budget: the month's plan in three peer views, switched in place. */
export function BudgetScreen() {
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ section?: Section }>();
  const [section, setSection] = useState<Section>(params.section && SECTIONS.includes(params.section) ? params.section : 'month');
  const { data, isPending, isError, refetch } = useSnapshot();

  return (
    <Screen>
      <View style={{ gap: spacing.lg }}>
        <AppText variant="title1" accessibilityRole="header">
          {it.budget.title}
        </AppText>
        <Segmented
          label={it.budget.sectionsLabel}
          value={section}
          onChange={setSection}
          options={SECTIONS.map((value) => ({ value, label: it.budget.sections[value] }))}
        />
        {isPending ? (
          <View style={{ gap: spacing.md }} accessibilityLabel="Caricamento">
            {[120, 44, 44, 44].map((h, i) => (
              <View key={i} style={{ height: h, borderRadius: radius.sign, backgroundColor: colors.track }} />
            ))}
          </View>
        ) : isError || !data ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="title3">{it.home.error.title}</AppText>
            <AppText tone="secondary">{it.home.error.body}</AppText>
            <PressableScale accessibilityRole="button" onPress={() => refetch()} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
              <AppText variant="bodyStrong">{it.home.error.retry}</AppText>
            </PressableScale>
          </View>
        ) : section === 'month' ? (
          <MonthSection data={data} />
        ) : section === 'subscriptions' ? (
          <SubscriptionsSection data={data} />
        ) : (
          <GoalsSection data={data} />
        )}
      </View>
    </Screen>
  );
}
