import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { LoadError, LoadingBlocks } from '@/components/load-state';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { AppText } from '@/components/text';
import { useSnapshot } from '@/data/queries';
import { it } from '@/i18n/it';
import { spacing } from '@/theme';

import { GoalsSection } from './goals-section';
import { MonthSection } from './month-section';
import { SubscriptionsSection } from './subscriptions-section';

type Section = 'month' | 'subscriptions' | 'goals';
const SECTIONS: Section[] = ['month', 'subscriptions', 'goals'];

/** Budget: the month's plan in three peer views, switched in place. */
export function BudgetScreen() {
  // `at` makes every link from another screen new, even to the section already asked for.
  const params = useLocalSearchParams<{ section?: Section; at?: string }>();
  const requested = params.section && SECTIONS.includes(params.section) ? params.section : undefined;
  const [section, setSection] = useState<Section>(requested ?? 'month');
  const link = `${requested ?? ''}|${params.at ?? ''}`;
  const [lastLink, setLastLink] = useState(link);
  if (link !== lastLink) {
    setLastLink(link);
    if (requested) setSection(requested);
  }
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
          <LoadingBlocks heights={[120, 44, 44, 44]} />
        ) : isError || !data ? (
          <LoadError onRetry={() => refetch()} />
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
