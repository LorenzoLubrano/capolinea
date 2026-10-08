import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Calendar } from '@/components/calendar';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useSaveGoal, useSnapshot } from '@/data/queries';
import type { Snapshot } from '@/data/repositories';
import { addMonthsClamped } from '@/domain/dates';
import { goalProgress } from '@/domain/goals';
import { appendKeypadKey, inputToMinor, minorToInput } from '@/domain/money';
import type { Goal, Id, LocalDate } from '@/domain/types';
import { AmountDisplay, ChoiceRow, SaveBar, TextField } from '@/features/add/form-parts';
import { it } from '@/i18n/it';
import { monthYear } from '@/services/format/dates';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, radius, spacing, useTheme } from '@/theme';

const ICONS = ['PiggyBank', 'AirplaneTilt', 'Laptop', 'Lifebuoy', 'House', 'Car', 'Bicycle', 'Gift', 'GraduationCap', 'Heart', 'Camera', 'Plant'];
const COLORS = ['blue', 'green', 'yellow', 'sky', 'magenta', 'teal', 'olive', 'slate', 'orange', 'plum'];

/** New goal or changes to one: name, icon, colour, target, optional date and account. */
export function GoalForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useSnapshot();
  if (!data) return <View style={{ flex: 1 }} />;
  const editing = id ? data.goals.find((g) => g.id === id) : undefined;
  return <GoalFormBody key={editing?.id ?? 'new'} data={data} editing={editing} />;
}

function GoalFormBody({ data, editing }: { data: Snapshot; editing?: Goal }) {
  const { colors, lineColor } = useTheme();
  const save = useSaveGoal();
  const showToast = useToast((s) => s.show);
  const masked = useSettings((s) => s.privacy);
  const savings = data.accounts.find((a) => a.type === 'savings');

  const [name, setName] = useState(editing?.name ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? 'PiggyBank');
  const [color, setColor] = useState(editing?.color ?? 'teal');
  const [input, setInput] = useState(editing ? minorToInput(editing.targetMinor) : '');
  const [targetDate, setTargetDate] = useState<LocalDate | undefined>(editing ? editing.targetDate : addMonthsClamped(data.today, 12));
  const [accountId, setAccountId] = useState<Id | undefined>(editing ? editing.accountId : savings?.id);
  const [picker, setPicker] = useState<'date' | null>(null);

  const targetMinor = inputToMinor(input);
  const money = (minor: number) => formatMoney(minor, data.currency, { masked, wholeUnits: true });
  const preview = goalProgress(
    { ...(editing ?? { id: '', createdAt: '', updatedAt: '', contributions: [] }), name, icon, color, targetMinor, currency: data.currency, targetDate },
    data.today,
  );
  const missing = !name.trim() ? it.goals.form.typeName : !targetMinor ? it.goals.form.typeTarget : null;

  const onSave = () => {
    if (missing || save.isPending) return;
    save.mutate(
      { id: editing?.id, name: name.trim(), icon, color, targetMinor, currency: data.currency, targetDate, accountId },
      {
        onSuccess: () => {
          haptics.success();
          router.back();
          showToast({ text: it.goals.form.saved });
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={editing ? it.goals.form.editTitle : it.goals.form.newTitle} left={{ label: it.add.cancel, onPress: () => router.back() }} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md, paddingBottom: spacing.md }} keyboardShouldPersistTaps="handled">
        <AmountDisplay
          input={input}
          label={name || it.goals.form.newTitle}
          caption={preview.monthlyNeededMinor ? it.goals.form.needed(money(preview.monthlyNeededMinor)) : undefined}
        />
        <TextField label={it.goals.form.name} value={name} onChangeText={setName} placeholder={it.goals.form.namePlaceholder} />

        <ChoiceRow label={it.goals.form.date}>
          <Chip
            label={targetDate ? monthYear(targetDate) : it.goals.form.noDate}
            selected={picker === 'date'}
            onPress={() => setPicker(picker === 'date' ? null : 'date')}
            leading={<Icon name="CalendarBlank" size={16} color={picker === 'date' ? colors.onInk : colors.ink} />}
          />
          {targetDate ? (
            <Chip
              label={it.goals.form.noDate}
              onPress={() => {
                haptics.selection();
                setTargetDate(undefined);
                setPicker(null);
              }}
            />
          ) : null}
        </ChoiceRow>
        {picker === 'date' ? (
          <Calendar
            value={targetDate ?? addMonthsClamped(data.today, 12)}
            today={data.today}
            onChange={(day) => {
              setTargetDate(day);
              setPicker(null);
            }}
          />
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <AppText variant="subheadStrong" tone="secondary">
            {it.goals.form.icon}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {ICONS.map((name) => {
              const selected = name === icon;
              return (
                <PressableScale
                  key={name}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={it.goals.form.iconLabel(it.goals.form.iconNames[name] ?? name)}
                  onPress={() => {
                    haptics.selection();
                    setIcon(name);
                  }}
                  style={{ width: 48, height: 48, borderRadius: radius.key, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.ink : colors.surfaceMuted }}
                >
                  <Icon name={name} size={22} color={selected ? colors.onInk : colors.ink} />
                </PressableScale>
              );
            })}
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="subheadStrong" tone="secondary">
            {it.goals.form.color}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {COLORS.map((key) => {
              const selected = key === color;
              return (
                <PressableScale
                  key={key}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={it.goals.form.colorLabel(it.goals.form.colorNames[key] ?? key)}
                  onPress={() => {
                    haptics.selection();
                    setColor(key);
                  }}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, borderWidth: 2, borderColor: selected ? colors.ink : 'transparent' }}
                >
                  <View style={{ width: 30, height: 30, borderRadius: radius.full, backgroundColor: lineColor(key).fill }} />
                </PressableScale>
              );
            })}
          </View>
        </View>

        <ChoiceRow label={it.goals.form.account}>
          {data.accounts
            .filter((a) => !a.archived)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={a.id === accountId}
                onPress={() => {
                  haptics.selection();
                  setAccountId(a.id === accountId ? undefined : a.id);
                }}
              />
            ))}
        </ChoiceRow>
      </ScrollView>
      <SaveBar
        onKey={(key) => setInput((current) => appendKeypadKey(current, key))}
        onClear={() => setInput('')}
        label={missing ?? (editing ? it.add.saveChanges : `${it.add.save} ${formatMoney(targetMinor, data.currency, { masked })}`)}
        ready={!missing}
        busy={save.isPending}
        onSave={onSave}
      />
      <ToastHost top={60} />
    </View>
  );
}
