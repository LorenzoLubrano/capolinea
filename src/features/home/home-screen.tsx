import { useMemo } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { LoadError } from '@/components/load-state';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useSnapshot } from '@/data/queries';
import { it } from '@/i18n/it';
import { useHeldWhileBlurred } from '@/services/focus';
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
    <View style={{ gap: spacing.lg, paddingTop: spacing.lg }} accessible accessibilityLabel={it.common.loading}>
      {block(18, '40%')}
      {block(54, '70%')}
      {block(52)}
      {block(120)}
    </View>
  );
}

export function HomeScreen() {
  const { colors } = useTheme();
  const snapshot = useSnapshot();
  const { isPending, isError, refetch } = snapshot;
  // A save from a sheet lands when the Home is back in view: the band moves where it can be seen.
  const data = useHeldWhileBlurred(snapshot.data);
  const summary = useMemo(() => (data ? buildHomeSummary(data) : null), [data]);
  const me = data?.people.find((p) => p.isMe);

  return (
    <Screen backdrop={summary && data ? <HomeBackdrop lines={summary.lines} latest={newestAddition(data.transactions)} /> : undefined}>
      <GreetingRow name={me?.name ?? ''} />
      {isPending ? (
        <HomeSkeleton />
      ) : isError || !summary || !data ? (
        <View style={{ paddingTop: spacing.xl }}>
          <LoadError onRetry={() => refetch()} />
        </View>
      ) : (
        <View style={{ gap: spacing.xl, paddingTop: spacing.md }}>
          <SpentHero summary={summary} />
          {summary.latest.length === 0 ? (
            <>
              {/* With a budget from the first launch, the band is there from the start: empty, with its terminus. */}
              {summary.budget ? <MonthBand summary={summary} /> : null}
              <View style={{ gap: spacing.xs }}>
                <AppText variant="title3">{it.home.empty.title}</AppText>
                <AppText tone="secondary">{it.home.empty.body}</AppText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm }}>
                  <Icon name="ArrowDown" size={16} color={colors.ink} weight="bold" />
                  <AppText variant="subheadStrong">{it.home.empty.guide}</AppText>
                </View>
              </View>
            </>
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
