import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsRow, SettingsSwitchRow } from '@/components/settings-group';
import { prototypeDataset, resolveFakeDate, type DatasetKind, type FakeDate } from '@/data/mock/variants';
import { useReloadSnapshot, useReplaceAll } from '@/data/queries';
import { toLocalDate } from '@/domain/dates';
import { it } from '@/i18n/it';
import { fullDate } from '@/services/format/dates';
import { haptics } from '@/services/haptics';
import { useAnalysisPeriod } from '@/state/analysis-period';
import { usePrototype } from '@/state/prototype';
import { useSettings } from '@/state/settings';
import { useSync, type SyncStatus } from '@/state/sync';
import { useToast } from '@/state/toast';
import { useTransactionFilters } from '@/state/transaction-filters';
import { spacing } from '@/theme';

const DATASETS: Exclude<DatasetKind, 'empty'>[] = ['full', 'noIncome', 'edge'];
const DATES: FakeDate[] = ['pinned', 'monthStart', 'monthEnd', 'real'];
const SYNC_STATES: SyncStatus[] = ['off', 'on', 'syncing', 'offline', 'error', 'conflict'];
const dayOf = (date: string) => fullDate(date).replace(/^\S+ /, '');

/**
 * Pannello prototipo (development only): which example data, which "today", a slow or unreadable
 * storage and the sync state, so every state of every screen can be seen on purpose.
 */
export function PrototypePanel() {
  const replaceAll = useReplaceAll();
  const reloadSnapshot = useReloadSnapshot();
  const { dataset, date, slow, readError, setLoaded, setSlow, setReadError } = usePrototype();
  const status = useSync((s) => s.status);
  const setStatus = useSync((s) => s.setStatus);
  const showToast = useToast((s) => s.show);
  // The real clock, read once when the panel opens: it names the «Data vera» row.
  const [now] = useState(() => new Date());

  const load = (kind: DatasetKind, when: FakeDate) => {
    if (replaceAll.isPending) return;
    haptics.selection();
    const today = resolveFakeDate(when, new Date());
    setLoaded(kind, when);
    replaceAll.mutate(prototypeDataset(kind, today), {
      onSuccess: () => {
        useTransactionFilters.getState().resetAll();
        useAnalysisPeriod.setState({ offset: 0 });
        if (kind !== 'empty') return showToast({ text: it.prototype.loaded(it.prototype.datasets[kind].done, dayOf(today)) });
        useSettings.getState().resetSecurity();
        useSync.getState().signOut();
        // The guard in the root layout takes the app to the onboarding.
        useSettings.getState().setOnboarded(false);
      },
    });
  };

  const reloadHome = () => {
    haptics.selection();
    void reloadSnapshot();
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/');
  };

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <SettingsGroup title={it.prototype.data} footer={it.prototype.dataFooter}>
          {DATASETS.map((kind) => (
            <SettingsRow
              key={kind}
              role="radio"
              checked={dataset === kind}
              title={it.prototype.datasets[kind].title}
              hint={it.prototype.datasets[kind].hint}
              onPress={() => load(kind, date)}
            />
          ))}
        </SettingsGroup>

        <SettingsGroup title={it.prototype.today}>
          {DATES.map((when) => (
            <SettingsRow
              key={when}
              role="radio"
              checked={date === when}
              title={when === 'real' ? it.prototype.dates.real : dayOf(resolveFakeDate(when, now))}
              hint={when === 'real' ? it.prototype.dates.realHint(dayOf(toLocalDate(now))) : it.prototype.dates[when]}
              // The user's own data (after a first launch) gives way to the full example.
              onPress={() => load(dataset === 'empty' ? 'full' : dataset, when)}
            />
          ))}
        </SettingsGroup>

        <SettingsGroup title={it.prototype.faults}>
          <SettingsSwitchRow title={it.prototype.slow} hint={it.prototype.slowHint} value={slow} onValueChange={setSlow} />
          <SettingsSwitchRow title={it.prototype.readError} hint={it.prototype.readErrorHint} value={readError} onValueChange={setReadError} />
          <SettingsRow icon="ArrowsClockwise" title={it.prototype.reload} hint={it.prototype.reloadHint} onPress={reloadHome} />
        </SettingsGroup>

        <SettingsGroup title={it.prototype.sync}>
          {SYNC_STATES.map((s) => (
            <SettingsRow
              key={s}
              role="radio"
              checked={status === s}
              title={it.prototype.syncStates[s]}
              onPress={() => {
                haptics.selection();
                setStatus(s);
              }}
            />
          ))}
          <SettingsRow icon="CloudCheck" title={it.prototype.openSync} onPress={() => router.push('/settings/sync')} />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow icon="ArrowCounterClockwise" title={it.prototype.firstLaunch} hint={it.prototype.firstLaunchHint} onPress={() => load('empty', date)} />
        </SettingsGroup>
      </View>
    </Screen>
  );
}
