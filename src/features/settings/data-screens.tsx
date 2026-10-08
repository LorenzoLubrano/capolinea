import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsInfoRow, SettingsRow } from '@/components/settings-group';
import { AppText } from '@/components/text';
import { createEmptyDataset } from '@/data/defaults';
import { useReplaceAll, useSnapshot } from '@/data/queries';
import { TextField } from '@/features/add/form-parts';
import { it } from '@/i18n/it';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useSync, type SyncStatus } from '@/state/sync';
import { useToast } from '@/state/toast';
import { useTransactionFilters } from '@/state/transaction-filters';
import { spacing, useTheme } from '@/theme';

/**
 * Elimina dati locali: a written confirmation instead of an undo, because nothing can bring the data
 * back. The app starts again from the defaults; appearance stays, the lock goes.
 */
export function DeleteDataScreen() {
  const { colors } = useTheme();
  const { data } = useSnapshot();
  const replaceAll = useReplaceAll();
  const resetSecurity = useSettings((s) => s.resetSecurity);
  const signOut = useSync((s) => s.signOut);
  const showToast = useToast((s) => s.show);
  const [typed, setTyped] = useState('');
  if (!data) return <Screen variant="stack">{null}</Screen>;
  const confirmed = typed.trim().toUpperCase() === it.deleteData.confirmWord;

  const onDelete = () => {
    if (!confirmed || replaceAll.isPending) return;
    haptics.medium();
    replaceAll.mutate(createEmptyDataset(data.today, data.currency), {
      onSuccess: () => {
        resetSecurity();
        signOut();
        useTransactionFilters.getState().resetAll();
        if (router.canDismiss()) router.dismissAll();
        router.navigate('/');
        showToast({ text: it.deleteData.done });
      },
    });
  };

  return (
    <Screen variant="stack" keyboardShouldPersistTaps="handled">
      <View style={{ gap: spacing.lg }}>
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title2">{it.deleteData.heading}</AppText>
          <AppText variant="body" tone="secondary">
            {it.deleteData.body}
          </AppText>
          <AppText variant="subheadStrong">{it.deleteData.counts(data.transactions.length, data.accounts.length, data.subscriptions.length, data.goals.length)}</AppText>
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
        <TextField label={it.deleteData.confirmLabel} value={typed} onChangeText={setTyped} placeholder={it.deleteData.confirmWord} />
        <Button label={it.deleteData.action} icon="Trash" variant="destructive" disabled={!confirmed} busy={replaceAll.isPending} onPress={onDelete} />
      </View>
    </Screen>
  );
}

/** Info: name, version, phase, licences; the prototype panel in development. */
export function InfoScreen() {
  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <SettingsGroup>
          <SettingsInfoRow title={it.info.name} value={it.info.nameValue} />
          <SettingsInfoRow title={it.info.version} value={Constants.expoConfig?.version ?? '–'} />
          <SettingsInfoRow title={it.info.phase} value={it.info.phaseValue} />
          <SettingsInfoRow title={it.info.data} value={it.info.dataValue} />
        </SettingsGroup>
        <SettingsGroup title={it.info.licenses}>
          {it.info.licenseList.map(([name, license]) => (
            <SettingsInfoRow key={name} title={name} value={license} />
          ))}
        </SettingsGroup>
        {__DEV__ ? (
          <SettingsGroup>
            <SettingsRow icon="Flask" title={it.info.prototype} hint={it.info.prototypeHint} onPress={() => router.push('/prototype')} />
          </SettingsGroup>
        ) : null}
      </View>
    </Screen>
  );
}

const SYNC_STATES: SyncStatus[] = ['off', 'on', 'syncing', 'offline', 'error', 'conflict'];

/** Pannello prototipo (development only). For now: force a sync state to see how it looks. */
export function PrototypePanel() {
  const status = useSync((s) => s.status);
  const setStatus = useSync((s) => s.setStatus);
  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
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
      </View>
    </Screen>
  );
}
