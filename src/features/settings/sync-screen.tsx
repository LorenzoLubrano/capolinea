import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { useAnnounce } from '@/services/a11y';
import { haptics } from '@/services/haptics';
import { useSync, type SyncProvider, type SyncStatus } from '@/state/sync';
import { useToast } from '@/state/toast';
import { layout, radius, spacing, useTheme } from '@/theme';

const ICONS: Record<SyncStatus, IconName> = {
  off: 'CloudSlash',
  on: 'CloudCheck',
  syncing: 'Cloud',
  offline: 'CloudSlash',
  error: 'CloudWarning',
  conflict: 'CloudWarning',
};

/** One version of the movement in conflict. */
function Version({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: spacing.xxs, padding: spacing.smd, borderRadius: radius.key, borderCurve: 'continuous', backgroundColor: colors.surfaceMuted }}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="subheadStrong">{value}</AppText>
    </View>
  );
}

/**
 * Sincronizzazione, a phase 3 concept: the six designed states, simulated. Words, icon and colour
 * together; red is never used, because the data on the phone is always safe.
 */
export function SyncScreen() {
  const { colors } = useTheme();
  const { status, provider, lastSyncAt, syncNow, signOut, resolveConflict } = useSync();
  const showToast = useToast((s) => s.show);
  const state = it.sync.states[status];
  // eslint-disable-next-line react-hooks/purity -- a relative time is read when the screen draws, like a clock.
  const minutes = lastSyncAt ? Math.floor((Date.now() - lastSyncAt) / 60000) : 0;
  const body = status === 'on' ? it.sync.states.on.body(it.sync.ago(minutes)) : (state as { body: string }).body;

  useAnnounce(state.title, { skipInitial: true });

  const resolve = () => {
    haptics.success();
    resolveConflict();
    showToast({ text: it.sync.resolved });
  };

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }} accessible accessibilityLiveRegion="polite">
          <View style={{ width: 48, height: 48, borderRadius: radius.full, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
            {status === 'syncing' ? <ActivityIndicator color={colors.ink} /> : <Icon name={ICONS[status]} size={26} color={status === 'error' || status === 'conflict' ? colors.warning : colors.ink} />}
          </View>
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <AppText variant="title3">{state.title}</AppText>
            <AppText variant="subhead" tone="secondary">
              {body}
            </AppText>
            {provider && status !== 'off' ? (
              <AppText variant="footnote" tone="tertiary">
                {it.sync.provider[provider]}
              </AppText>
            ) : null}
          </View>
        </View>

        {status === 'conflict' ? (
          <View style={{ gap: spacing.smd }}>
            <AppText variant="bodyStrong">{it.sync.conflictItem}</AppText>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Version label={it.sync.conflictThis} value={it.sync.conflictThisValue} />
              <Version label={it.sync.conflictOther} value={it.sync.conflictOtherValue} />
            </View>
            <Button label={it.sync.keepThis} onPress={resolve} />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button label={it.sync.keepOther} variant="secondary" onPress={resolve} style={{ flex: 1 }} />
              <Button label={it.sync.keepBoth} variant="secondary" onPress={resolve} style={{ flex: 1 }} />
            </View>
          </View>
        ) : null}

        {status === 'off' ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="subheadStrong" tone="secondary" accessibilityRole="header">
              {it.sync.what}
            </AppText>
            {it.sync.whatList.map((line) => (
              <View key={line} style={{ flexDirection: 'row', gap: spacing.smd }}>
                <Icon name="Check" size={18} color={colors.ink} />
                <AppText variant="subhead" style={{ flex: 1 }}>
                  {line}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          {status === 'off' ? <Button label={it.sync.enable} icon="CloudArrowUp" onPress={() => router.push('/settings/sync-signin')} /> : null}
          {status === 'on' ? <Button label={it.sync.syncNow} icon="ArrowsClockwise" variant="secondary" onPress={syncNow} /> : null}
          {status === 'error' || status === 'offline' ? <Button label={it.sync.retry} icon="ArrowsClockwise" variant="secondary" onPress={syncNow} /> : null}
          {status !== 'off' ? (
            <Button
              label={it.sync.signOut}
              variant="destructive"
              onPress={() => {
                haptics.medium();
                signOut();
                showToast({ text: it.sync.signedOut });
              }}
            />
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.smd }}>
          <Icon name="Flask" size={18} color={colors.inkSecondary} />
          <AppText variant="footnote" tone="secondary" style={{ flex: 1 }}>
            {it.sync.concept}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

/** Concept sign-in: three ways in, no password. In phase 1 it only pretends. */
export function SyncSignInSheet() {
  const { colors } = useTheme();
  const signIn = useSync((s) => s.signIn);
  const choose = (provider: SyncProvider) => {
    haptics.light();
    signIn(provider);
    router.back();
  };
  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={it.sync.signIn.title} left={{ label: it.common.cancel, onPress: () => router.back() }} />
      <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.md, gap: spacing.lg }}>
        <AppText variant="body" tone="secondary">
          {it.sync.signIn.body}
        </AppText>
        <View style={{ gap: spacing.sm }}>
          <Button label={it.sync.signIn.apple} onPress={() => choose('apple')} />
          <Button label={it.sync.signIn.google} variant="secondary" onPress={() => choose('google')} />
          <Button label={it.sync.signIn.email} icon="EnvelopeSimple" variant="secondary" onPress={() => choose('email')} />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.smd }}>
          <Icon name="Flask" size={18} color={colors.inkSecondary} />
          <AppText variant="footnote" tone="secondary" style={{ flex: 1 }}>
            {it.sync.signIn.simulated}
          </AppText>
        </View>
      </View>
    </View>
  );
}
