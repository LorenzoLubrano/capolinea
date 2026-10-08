import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { AppText } from '@/components/text';
import { useReplaceAll, useSnapshot } from '@/data/queries';
import { TextField } from '@/features/add/form-parts';
import { it } from '@/i18n/it';
import { useAnnounce } from '@/services/a11y';
import { fullDate } from '@/services/format/dates';
import { haptics } from '@/services/haptics';
import { pickTextFile } from '@/services/pick-file';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { useTransactionFilters } from '@/state/transaction-filters';
import { radius, spacing, useTheme } from '@/theme';

import { parseBackup, type ParsedBackup } from './restore';

const MAX_BYTES = 20 * 1024 * 1024;
const dayOf = (date: string) => fullDate(date).replace(/^\S+ /, '');

/**
 * Ripristina un backup: pick, check, preview, confirm. The file is never trusted: it is validated
 * before anything is shown, and the data is replaced only after the preview.
 */
export function RestoreScreen() {
  const { colors } = useTheme();
  const { data } = useSnapshot();
  const replaceAll = useReplaceAll();
  const setOnboarded = useSettings((s) => s.setOnboarded);
  const showToast = useToast((s) => s.show);
  const [parsed, setParsed] = useState<ParsedBackup | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [typed, setTyped] = useState('');
  // Replacing real data asks for a written word; an empty phone does not.
  const hasData = (data?.transactions.length ?? 0) > 0;
  const confirmed = !hasData || typed.trim().toUpperCase() === it.restore.confirmWord;

  useAnnounce(problem);

  const pick = async () => {
    setReading(true);
    setProblem(null);
    setParsed(null);
    setTyped('');
    const picked = await pickTextFile(MAX_BYTES);
    setReading(false);
    if (!picked) return;
    if ('error' in picked) return setProblem(picked.error === 'too-big' ? it.restore.problems.size : it.restore.problems.read);
    const result = parseBackup(picked.text, { maxBytes: MAX_BYTES });
    if (!result.ok) {
      haptics.warning();
      return setProblem(it.restore.problems[result.reason]);
    }
    haptics.selection();
    setParsed(result);
  };

  const restore = () => {
    if (!data || !parsed?.ok || !confirmed || replaceAll.isPending) return;
    replaceAll.mutate(
      { ...parsed.data, today: data.today },
      {
        onSuccess: () => {
          haptics.success();
          useTransactionFilters.getState().resetAll();
          const fromOnboarding = !useSettings.getState().onboarded;
          setOnboarded(true);
          if (fromOnboarding) {
            // The guard has just dropped the onboarding: this screen gives way to the Home.
            router.replace('/');
          } else {
            if (router.canDismiss()) router.dismissAll();
            router.navigate('/');
          }
          showToast({ text: it.restore.done });
        },
      },
    );
  };

  const summary = parsed?.ok ? parsed.summary : null;

  return (
    <Screen variant="stack" keyboardShouldPersistTaps="handled">
      <View style={{ gap: spacing.lg }}>
        <AppText variant="body" tone="secondary">
          {it.restore.body}
        </AppText>
        <Button label={summary ? it.restore.pickAnother : it.restore.pick} icon="Database" variant={summary ? 'secondary' : 'primary'} busy={reading} onPress={pick} />
        {problem ? (
          <View style={{ flexDirection: 'row', gap: spacing.smd }} accessibilityLiveRegion="polite">
            <Icon name="Warning" size={18} color={colors.warning} />
            <AppText variant="subhead" tone="warning" style={{ flex: 1 }}>
              {problem}
            </AppText>
          </View>
        ) : null}
        {summary ? (
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs, padding: spacing.md, borderRadius: radius.card, borderCurve: 'continuous', backgroundColor: colors.surface }}>
              <AppText variant="title3">{it.restore.preview(dayOf(summary.exportedAt.slice(0, 10)))}</AppText>
              <AppText variant="subhead" tone="secondary">
                {it.restore.counts(summary.transactions, summary.accounts, summary.categories, summary.subscriptions, summary.goals)}
              </AppText>
              {summary.firstDate && summary.lastDate ? (
                <AppText variant="subhead" tone="secondary">
                  {it.restore.range(dayOf(summary.firstDate), dayOf(summary.lastDate))}
                </AppText>
              ) : null}
            </View>
            {hasData ? (
              <>
                <View style={{ flexDirection: 'row', gap: spacing.smd }}>
                  <Icon name="Warning" size={18} color={colors.warning} />
                  <AppText variant="subhead" style={{ flex: 1 }}>
                    {it.restore.replaces(data?.transactions.length ?? 0)}
                  </AppText>
                </View>
                <PressableScale
                  accessibilityRole="link"
                  feedback="dim"
                  onPress={() => router.push('/settings/export')}
                  style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' }}
                >
                  <Icon name="Export" size={18} color={colors.ink} />
                  <AppText variant="subheadStrong">{it.deleteData.backupFirst}</AppText>
                  <Icon name="CaretRight" size={14} color={colors.ink} weight="bold" />
                </PressableScale>
                <TextField label={it.restore.confirmLabel} value={typed} onChangeText={setTyped} placeholder={it.restore.confirmWord} />
              </>
            ) : null}
            <Button label={it.restore.action} icon="ArrowCounterClockwise" variant={hasData ? 'destructive' : 'primary'} disabled={!confirmed} busy={replaceAll.isPending} onPress={restore} />
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
