import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsRow } from '@/components/settings-group';
import { AppText } from '@/components/text';
import { useSnapshot } from '@/data/queries';
import { periodAt } from '@/domain/analysis';
import { isWithin, monthStart } from '@/domain/dates';
import type { LocalDate } from '@/domain/types';
import { it } from '@/i18n/it';
import { haptics } from '@/services/haptics';
import { shareTextFile } from '@/services/share-file';
import { useToast } from '@/state/toast';
import { spacing, useTheme } from '@/theme';

import { buildBackup, buildTransactionsCsv, exportFileName } from './export';

type Kind = 'csv' | 'backup';
type Period = 'all' | 'year' | 'month' | 'lastMonth';
const PERIODS: Period[] = ['all', 'year', 'month', 'lastMonth'];

function rangeOf(period: Period, today: LocalDate): { from?: LocalDate; to?: LocalDate } {
  if (period === 'year') return { from: `${today.slice(0, 4)}-01-01`, to: today };
  if (period === 'month') return { from: monthStart(today), to: today };
  if (period === 'lastMonth') return periodAt('month', today, -1);
  return {};
}

/** Esporta e backup: movements as CSV for a spreadsheet, or everything as a JSON backup. */
export function ExportScreen() {
  const { colors } = useTheme();
  const { data } = useSnapshot();
  const showToast = useToast((s) => s.show);
  const [kind, setKind] = useState<Kind>('csv');
  const [period, setPeriod] = useState<Period>('all');
  const [busy, setBusy] = useState(false);
  if (!data) return <Screen variant="stack">{null}</Screen>;

  const range = rangeOf(period, data.today);
  const count = data.transactions.filter((t) => isWithin(t.date, range.from ?? '0000-01-01', range.to ?? '9999-12-31')).length;

  const onExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (kind === 'csv') {
        // The byte order mark lets Excel read the accents right.
        await shareTextFile(exportFileName('csv', data.today), `﻿${buildTransactionsCsv(data, range)}`, 'text/csv');
      } else {
        await shareTextFile(exportFileName('backup', data.today), buildBackup(data, new Date().toISOString()), 'application/json');
      }
      haptics.success();
      showToast({ text: it.exportScreen.done });
    } catch {
      haptics.warning();
      showToast({ text: it.exportScreen.failed });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <SettingsGroup title={it.exportScreen.what}>
          {(['csv', 'backup'] as const).map((k) => (
            <SettingsRow
              key={k}
              role="radio"
              checked={kind === k}
              icon={k === 'csv' ? 'ListBullets' : 'Database'}
              title={k === 'csv' ? it.exportScreen.csv : it.exportScreen.backup}
              hint={k === 'csv' ? it.exportScreen.csvHint : it.exportScreen.backupHint}
              onPress={() => {
                haptics.selection();
                setKind(k);
              }}
            />
          ))}
        </SettingsGroup>

        {kind === 'csv' ? (
          <View style={{ gap: spacing.sm }}>
            <AppText variant="subheadStrong" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
              {it.exportScreen.period}
            </AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {PERIODS.map((p) => (
                <Chip
                  key={p}
                  label={it.exportScreen.periods[p]}
                  selected={period === p}
                  onPress={() => {
                    haptics.selection();
                    setPeriod(p);
                  }}
                />
              ))}
            </View>
            <AppText variant="subhead" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
              {it.exportScreen.movements(count)}
            </AppText>
          </View>
        ) : (
          <AppText variant="subhead" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
            {`${it.exportScreen.movements(data.transactions.length)}, ${it.exportScreen.contents(data.accounts.length, data.categories.length, data.subscriptions.length, data.goals.length)}`}
          </AppText>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.smd, paddingHorizontal: spacing.xs }}>
          <Icon name="Warning" size={18} color={colors.warning} />
          <AppText variant="footnote" tone="secondary" style={{ flex: 1 }}>
            {it.exportScreen.warning}
          </AppText>
        </View>
        <Button label={it.exportScreen.action} icon="Export" busy={busy} disabled={kind === 'csv' && count === 0} onPress={onExport} />
      </View>
    </Screen>
  );
}
