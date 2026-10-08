import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { Money } from '@/components/money';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useAddPerson, useSnapshot } from '@/data/queries';
import { cleanAmountText, inputToMinor, minorToInput } from '@/domain/money';
import { computeShares, splitEvenly, type SplitDraft, type SplitMode } from '@/domain/splits';
import type { Id } from '@/domain/types';
import { it } from '@/i18n/it';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useSplitDraft } from '@/state/split-draft';
import { layout, radius, spacing, type, useTheme } from '@/theme';

const MODES: SplitMode[] = ['equal', 'amounts', 'percent'];

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="subheadStrong" tone="secondary" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

/** Equal starting values for the amounts and percent modes, so switching never starts from zero. */
function equalTexts(mode: SplitMode, total: number, ids: Id[]): Record<Id, string> {
  if (mode === 'amounts') return Object.fromEntries(splitEvenly(total, ids).map((s) => [s.personId, minorToInput(s.amountMinor)]));
  if (mode === 'percent') {
    const base = Math.floor(10000 / ids.length) / 100;
    return Object.fromEntries(
      ids.map((id, i) => [id, String(i === 0 ? Math.round((100 - base * (ids.length - 1)) * 100) / 100 : base).replace('.', ',')]),
    );
  }
  return {};
}

/** Dividi la spesa: with whom, how, who paid. The result goes back to the expense form. */
export function SplitSheet() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { total: totalParam } = useLocalSearchParams<{ total: string }>();
  const total = Number(totalParam) || 0;
  const { data } = useSnapshot();
  const addPerson = useAddPerson();
  const masked = useSettings((s) => s.privacy);
  const { draft, setDraft } = useSplitDraft();
  const meId = data?.meId ?? '';

  const [others, setOthers] = useState<Id[]>(() => draft?.personIds.filter((id) => id !== meId) ?? []);
  const [mode, setMode] = useState<SplitMode>(draft?.mode ?? 'equal');
  const [texts, setTexts] = useState<Record<Id, string>>(() =>
    draft
      ? Object.fromEntries(
          Object.entries(draft.values).map(([id, v]) => [id, draft.mode === 'amounts' ? minorToInput(v) : String(v).replace('.', ',')]),
        )
      : {},
  );
  const [paidBy, setPaidBy] = useState<Id>(draft?.paidBy ?? meId);
  const [newName, setNewName] = useState<string | null>(null);

  if (!data) return <View style={{ flex: 1 }} />;

  const people = new Map(data.people.map((p) => [p.id, p.name]));
  const personIds = [meId, ...others];
  const nameOf = (id: Id) => (id === meId ? it.split.me : (people.get(id) ?? ''));
  const values: Record<Id, number> = Object.fromEntries(
    personIds.map((id) => {
      const text = cleanAmountText(texts[id] ?? '');
      return [id, mode === 'amounts' ? inputToMinor(text) : Number(text.replace(',', '.')) || 0];
    }),
  );
  const next: SplitDraft = { personIds, mode, values, paidBy: personIds.includes(paidBy) ? paidBy : meId };
  const result = computeShares(total, next);
  const money = (minor: number) => formatMoney(minor, data.currency, { masked });

  const status = (() => {
    if (!result.ok && result.reason === 'people') return { text: it.split.choosePeople, tone: 'secondary' as const };
    if (!result.ok && result.reason === 'sum')
      return {
        text: result.differenceMinor > 0 ? it.split.missing(money(result.differenceMinor)) : it.split.over(money(-result.differenceMinor)),
        tone: 'warning' as const,
      };
    if (!result.ok && result.reason === 'percent') {
      const p = String(Math.abs(result.differencePercent)).replace('.', ',');
      return { text: result.differencePercent > 0 ? it.split.missingPercent(p) : it.split.overPercent(p), tone: 'warning' as const };
    }
    if (mode === 'equal' && result.ok) return { text: `${money(result.shares[0].amountMinor)} ${it.split.each}`, tone: 'secondary' as const };
    return { text: it.split.allAssigned, tone: 'secondary' as const };
  })();

  const changePeople = (ids: Id[]) => {
    setOthers(ids);
    setTexts(equalTexts(mode, total, [meId, ...ids]));
    if (!ids.includes(paidBy) && paidBy !== meId) setPaidBy(meId);
  };

  const togglePerson = (id: Id) => {
    haptics.selection();
    changePeople(others.includes(id) ? others.filter((x) => x !== id) : [...others, id]);
  };

  const confirmNewPerson = () => {
    const name = (newName ?? '').trim();
    if (!name) return;
    addPerson.mutate(name, {
      onSuccess: (person) => {
        setNewName(null);
        changePeople([...others, person.id]);
      },
    });
  };

  const field = (id: Id, suffix: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <TextInput
        accessibilityLabel={it.split.shareLabel(nameOf(id))}
        value={texts[id] ?? ''}
        onChangeText={(text) => setTexts({ ...texts, [id]: cleanAmountText(text) })}
        keyboardType="decimal-pad"
        selectionColor={colors.ink}
        style={[type.bodyStrong, { width: 112, minHeight: 44, textAlign: 'right', color: colors.ink, paddingHorizontal: spacing.smd, borderRadius: radius.key, backgroundColor: colors.surfaceMuted }]}
      />
      <AppText variant="bodyStrong" tone="secondary">
        {suffix}
      </AppText>
    </View>
  );

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader
        title={it.split.title}
        left={{ label: it.add.cancel, onPress: () => router.back() }}
        right={
          draft
            ? {
                label: it.split.remove,
                onPress: () => {
                  setDraft(null);
                  router.back();
                },
              }
            : undefined
        }
      />
      <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingVertical: spacing.md, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <AppText variant="callout" tone="secondary">
            {it.split.total}
          </AppText>
          <Money minor={total} currency={data.currency} variant="figure" />
        </View>

        <Group title={it.split.with}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {data.people
              .filter((p) => !p.isMe)
              .map((p) => (
                <Chip key={p.id} label={p.name} selected={others.includes(p.id)} onPress={() => togglePerson(p.id)} />
              ))}
            {newName === null ? (
              <Chip label={it.split.addPerson} onPress={() => setNewName('')} leading={<Icon name="UserPlus" size={16} color={colors.ink} />} />
            ) : null}
          </View>
          {newName !== null ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <TextInput
                accessibilityLabel={it.split.newPersonLabel}
                value={newName}
                onChangeText={setNewName}
                placeholder={it.split.newPersonPlaceholder}
                placeholderTextColor={colors.inkTertiary}
                selectionColor={colors.ink}
                autoFocus
                onSubmitEditing={confirmNewPerson}
                style={[type.body, { flex: 1, minHeight: 44, color: colors.ink, paddingHorizontal: spacing.smd, borderRadius: radius.key, backgroundColor: colors.surfaceMuted }]}
              />
              <Button label={it.split.addPersonConfirm} variant="secondary" onPress={confirmNewPerson} busy={addPerson.isPending} />
            </View>
          ) : null}
        </Group>

        <Group title={it.split.how}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {MODES.map((m) => (
              <Chip
                key={m}
                label={it.split.modes[m]}
                selected={mode === m}
                onPress={() => {
                  haptics.selection();
                  setMode(m);
                  setTexts(equalTexts(m, total, personIds));
                }}
              />
            ))}
          </View>
        </Group>

        <Group title={it.split.shares}>
          <View>
            {personIds.map((id, i) => {
              const share = result.ok ? result.shares[i].amountMinor : undefined;
              return (
                <View
                  key={id}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.hairline }}
                >
                  <View style={{ gap: spacing.xxs }}>
                    <AppText variant="bodyStrong">{nameOf(id)}</AppText>
                    {mode === 'percent' && share !== undefined ? <Money minor={share} currency={data.currency} variant="footnote" tone="secondary" /> : null}
                  </View>
                  {mode === 'equal' ? (
                    share !== undefined ? <Money minor={share} currency={data.currency} variant="bodyStrong" /> : null
                  ) : (
                    field(id, mode === 'amounts' ? '€' : '%')
                  )}
                </View>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            {result.ok ? <Icon name="Check" size={14} weight="bold" color={colors.inkSecondary} /> : null}
            <AppText variant="footnote" tone={status.tone}>
              {status.text}
            </AppText>
          </View>
        </Group>

        <Group title={it.split.paidBy}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {personIds.map((id) => (
              <Chip
                key={id}
                label={nameOf(id)}
                selected={next.paidBy === id}
                onPress={() => {
                  haptics.selection();
                  setPaidBy(id);
                }}
              />
            ))}
          </View>
        </Group>
      </ScrollView>
      <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        <Button
          label={it.split.confirm}
          disabled={!result.ok}
          onPress={() => {
            haptics.success();
            setDraft(next);
            router.back();
          }}
        />
      </View>
      <ToastHost top={60} />
    </View>
  );
}
