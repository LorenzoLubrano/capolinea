import { useMemo } from 'react';
import { View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useSnapshot } from '@/data/queries';
import { it } from '@/i18n/it';
import { radius, spacing, useTheme } from '@/theme';

import { newestAddition } from './backdrop';
import { BalanceSection } from './balance-section';
import { GreetingRow } from './greeting-row';
import { HomeBackdrop } from './home-backdrop';
import { LatestStops } from './latest-stops';
import { SharedRow } from './shared-row';
import { LinesList } from './lines-list';
import { MonthBand } from './month-band';
import { SpentHero } from './spent-hero';
import { buildHomeSummary } from './summary';

/** Loading keeps the layout: blocks where the hero and the band will be, no spinner. */
function HomeSkeleton() {
  const { colors } = useTheme();
  const block = (height: number, width: number | `${number}%` = '100%') => (
    <View style={{ height, width, borderRadius: radius.sign, backgroundColor: colors.track }} />
  );
  return (
    <View style={{ gap: spacing.lg, paddingTop: spacing.lg }} accessibilityLabel="Caricamento">
      {block(18, '40%')}
      {block(54, '70%')}
      {block(52)}
      {block(120)}
    </View>
  );
}

export function HomeScreen() {
  const { data, isPending, isError, refetch } = useSnapshot();
  const summary = useMemo(() => (data ? buildHomeSummary(data) : null), [data]);
  const me = data?.people.find((p) => p.isMe);

  return (
    <Screen backdrop={summary && data ? <HomeBackdrop lines={summary.lines} latest={newestAddition(data.transactions)} /> : undefined}>
      <GreetingRow name={me?.name ?? ''} />
      {isPending ? (
        <HomeSkeleton />
      ) : isError || !summary || !data ? (
        <View style={{ gap: spacing.sm, paddingTop: spacing.xl }}>
          <AppText variant="title2">{it.home.error.title}</AppText>
          <AppText tone="secondary">{it.home.error.body}</AppText>
          <PressableScale accessibilityRole="button" onPress={() => refetch()} style={{ alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' }}>
            <AppText variant="bodyStrong">{it.home.error.retry}</AppText>
          </PressableScale>
        </View>
      ) : (
        <View style={{ gap: spacing.xl, paddingTop: spacing.md }}>
          <SpentHero summary={summary} />
          {summary.latest.length === 0 ? (
            <View style={{ gap: spacing.xs }}>
              <AppText variant="title3">{it.home.empty.title}</AppText>
              <AppText tone="secondary">{it.home.empty.body}</AppText>
            </View>
          ) : (
            <>
              <MonthBand summary={summary} />
              <View style={{ gap: spacing.xs }}>
                <BalanceSection summary={summary} today={data.today} />
                <SharedRow data={data} />
              </View>
              <LinesList summary={summary} />
              <LatestStops transactions={summary.latest} categories={data.categories} today={data.today} currency={summary.currency} meId={data.meId} />
            </>
          )}
        </View>
      )}
    </Screen>
  );
}
