import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Calendar } from '@/components/calendar';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { LineBadge } from '@/components/line-badge';
import { Money } from '@/components/money';
import { PressableScale } from '@/components/pressable-scale';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { useAddSubscription, useSnapshot, useUpdateSubscription } from '@/data/queries';
import type { Snapshot } from '@/data/repositories';
import { monthlyEquivalent, yearlyEquivalent } from '@/domain/breakdown';
import { addDays, addMonthsClamped } from '@/domain/dates';
import { appendKeypadKey, inputToMinor, minorToInput } from '@/domain/money';
import type { Frequency, Id, LocalDate, Subscription } from '@/domain/types';
import { it } from '@/i18n/it';
import { useDiscardGuard } from '@/services/discard-guard';
import { useAnnounce } from '@/services/a11y';
import { shortDate } from '@/services/format/dates';
import { frequencyLabel } from '@/services/format/frequency';
import { formatMoney } from '@/services/format/money';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, radius, spacing, useTheme } from '@/theme';

import { AmountDisplay, ChoiceRow, SaveBar, TextField } from './form-parts';
import { defaultAccountId } from './suggestions';
import { SUBSCRIPTION_TEMPLATES, type SubscriptionTemplate } from './subscription-templates';

type Preset = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
const PRESETS: Record<Exclude<Preset, 'custom'>, Frequency> = {
  weekly: { unit: 'week', interval: 1 },
  monthly: { unit: 'month', interval: 1 },
  quarterly: { unit: 'month', interval: 3 },
  yearly: { unit: 'year', interval: 1 },
};
const UNITS: Frequency['unit'][] = ['week', 'month', 'year'];

function presetOf(frequency: Frequency): Preset {
  const match = (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).find(
    (key) => PRESETS[key].unit === frequency.unit && PRESETS[key].interval === frequency.interval,
  );
  return match ?? 'custom';
}

/** The next charge one period after today: a sensible default the user moves if needed. */
function nextCharge(today: LocalDate, { unit, interval }: Frequency): LocalDate {
  if (unit === 'week') return addDays(today, 7 * interval);
  return addMonthsClamped(today, unit === 'year' ? 12 * interval : interval);
}

/** Nuovo abbonamento: a template (or custom), then price, frequency, next charge. */
export function SubscriptionForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data } = useSnapshot();
  const [template, setTemplate] = useState<SubscriptionTemplate | 'custom' | null>(null);
  if (!data) return <View style={{ flex: 1 }} />;
  const editing = id ? data.subscriptions.find((s) => s.id === id) : undefined;
  if (editing) return <SubscriptionDetails data={data} editing={editing} onBack={() => router.back()} />;
  if (!template) return <TemplatePicker data={data} onPick={setTemplate} />;
  return <SubscriptionDetails data={data} template={template === 'custom' ? undefined : template} onBack={() => setTemplate(null)} />;
}

function TemplatePicker({ data, onPick }: { data: Snapshot; onPick: (t: SubscriptionTemplate | 'custom') => void }) {
  const { colors } = useTheme();
  const categories = new Map(data.categories.map((c) => [c.id, c]));
  const tile = { borderRadius: radius.control, borderCurve: 'continuous', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline } as const;

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title={it.subscriptionForm.title} left={{ label: it.add.cancel, onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingVertical: spacing.md, gap: spacing.md }}>
        <View style={{ gap: spacing.xs }}>
          <AppText variant="subheadStrong" tone="secondary" accessibilityRole="header">
            {it.subscriptionForm.pick}
          </AppText>
          <AppText variant="footnote" tone="secondary">
            {it.subscriptionForm.pickHint}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {SUBSCRIPTION_TEMPLATES.map((t) => {
            const category = categories.get(t.categoryId);
            return (
              <PressableScale
                key={t.name}
                accessibilityRole="button"
                accessibilityLabel={`${t.name}, ${formatMoney(t.amountMinor, data.currency)}, ${frequencyLabel(t.frequency)}`}
                onPress={() => {
                  haptics.selection();
                  onPick(t);
                }}
                style={{ ...tile, flexBasis: '47%', flexGrow: 1, gap: spacing.sm, padding: spacing.smd }}
              >
                <LineBadge color={category?.color ?? 'grey'} name={t.name} size={32} />
                <View style={{ gap: spacing.xxs }}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {t.name}
                  </AppText>
                  <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
                    <Money minor={t.amountMinor} currency={data.currency} variant="footnote" tone="secondary" />
                    <AppText variant="footnote" tone="secondary">
                      {`· ${frequencyLabel(t.frequency).toLowerCase()}`}
                    </AppText>
                  </View>
                </View>
              </PressableScale>
            );
          })}
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`${it.subscriptionForm.custom}. ${it.subscriptionForm.customHint}`}
          onPress={() => onPick('custom')}
          style={{ ...tile, flexDirection: 'row', alignItems: 'center', gap: spacing.smd, padding: spacing.md }}
        >
          <Icon name="Plus" size={22} color={colors.ink} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyStrong">{it.subscriptionForm.custom}</AppText>
            <AppText variant="footnote" tone="secondary">
              {it.subscriptionForm.customHint}
            </AppText>
          </View>
          <Icon name="CaretRight" size={16} color={colors.inkTertiary} />
        </PressableScale>
      </ScrollView>
    </View>
  );
}

function SubscriptionDetails({
  data,
  template,
  editing,
  onBack,
}: {
  data: Snapshot;
  template?: SubscriptionTemplate;
  editing?: Subscription;
  onBack: () => void;
}) {
  const { colors } = useTheme();
  const addSubscription = useAddSubscription();
  const updateSubscription = useUpdateSubscription();
  const showToast = useToast((s) => s.show);
  const masked = useSettings((s) => s.privacy);

  const [name, setName] = useState(editing?.name ?? template?.name ?? '');
  const [input, setInput] = useState(() => {
    const minor = editing?.amountMinor ?? template?.amountMinor;
    return minor ? minorToInput(minor) : '';
  });
  const [frequency, setFrequency] = useState<Frequency>(editing?.frequency ?? template?.frequency ?? PRESETS.monthly);
  const [custom, setCustom] = useState(false);
  const [anchorDate, setAnchorDate] = useState<LocalDate>(
    editing?.nextBillingDate ?? nextCharge(data.today, template?.frequency ?? PRESETS.monthly),
  );
  const [dateTouched, setDateTouched] = useState(!!editing);
  const [categoryId, setCategoryId] = useState<Id | undefined>(editing?.categoryId ?? template?.categoryId);
  const [accountId, setAccountId] = useState<Id>(editing?.accountId ?? defaultAccountId(data));
  const [picker, setPicker] = useState<'account' | 'date' | null>(null);
  const [allCategories, setAllCategories] = useState(false);
  const allowLeave = useDiscardGuard({ name, input, frequency, anchorDate, categoryId, accountId });

  const amountMinor = inputToMinor(input);
  const preset: Preset = custom ? 'custom' : presetOf(frequency);
  const accounts = data.accounts.filter((a) => !a.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const expense = data.categories.filter((c) => c.kind === 'expense' && !c.archived).sort((a, b) => a.sortOrder - b.sortOrder);
  const usual = new Set([...data.subscriptions.map((s) => s.categoryId), ...(categoryId ? [categoryId] : [])]);
  const categories = allCategories ? expense : expense.filter((c) => usual.has(c.id));
  const money = (minor: number) => formatMoney(minor, data.currency, { masked });
  const sample = { amountMinor, frequency } as Subscription;

  const changeFrequency = (next: Frequency) => {
    setFrequency(next);
    if (!dateTouched) setAnchorDate(nextCharge(data.today, next));
  };

  const stepper = (step: -1 | 1) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={step < 0 ? it.subscriptionForm.decrease : it.subscriptionForm.increase}
      disabled={step < 0 && frequency.interval <= 1}
      onPress={() => changeFrequency({ ...frequency, interval: Math.min(Math.max(frequency.interval + step, 1), 52) })}
      style={{ width: 44, height: 44, borderRadius: radius.key, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon name={step < 0 ? 'Minus' : 'Plus'} size={18} color={colors.ink} />
    </PressableScale>
  );

  const missing = !name.trim() ? it.subscriptionForm.typeName : !amountMinor ? it.add.typeAmount : !categoryId ? it.add.chooseCategory : null;

  const save = () => {
    if (missing || addSubscription.isPending || updateSubscription.isPending || !categoryId) return;
    if (editing) {
      const moved = anchorDate !== editing.nextBillingDate;
      updateSubscription.mutate(
        {
          id: editing.id,
          changes: { name: name.trim(), amountMinor, frequency, categoryId, accountId, ...(moved ? { anchorDate } : {}) },
        },
        {
          onSuccess: ({ generated }) => {
            haptics.success();
            allowLeave();
            router.back();
            showToast({ text: generated ? it.subscriptions.detail.updatedWithCharges(generated) : it.subscriptions.detail.updated });
          },
        },
      );
      return;
    }
    addSubscription.mutate(
      { name: name.trim(), amountMinor, currency: data.currency, frequency, anchorDate, categoryId, accountId, active: true },
      {
        onSuccess: ({ generated }) => {
          haptics.success();
          allowLeave();
          router.back();
          showToast({ text: generated ? it.subscriptionForm.savedWithCharges(generated) : it.subscriptionForm.saved });
        },
      },
    );
  };

  useAnnounce(frequencyLabel(frequency), { skipInitial: true });

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader
        title={editing ? it.subscriptions.detail.editTitle : (template?.name ?? it.subscriptionForm.title)}
        left={{ label: editing ? it.add.cancel : it.subscriptionForm.back, onPress: onBack }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, gap: spacing.md, paddingBottom: spacing.md }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.xs }}>
          <Chip
            label={accounts.find((a) => a.id === accountId)?.name ?? ''}
            selected={picker === 'account'}
            onPress={() => setPicker(picker === 'account' ? null : 'account')}
            leading={<Icon name="CaretDown" size={14} color={picker === 'account' ? colors.onInk : colors.ink} />}
          />
          <Chip
            label={`${it.subscriptionForm.next}: ${shortDate(anchorDate)}`}
            selected={picker === 'date'}
            onPress={() => setPicker(picker === 'date' ? null : 'date')}
            leading={<Icon name="CalendarBlank" size={16} color={picker === 'date' ? colors.onInk : colors.ink} />}
          />
        </View>
        {picker === 'account' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm }}>
            {accounts.map((a) => (
              <Chip
                key={a.id}
                label={a.name}
                selected={a.id === accountId}
                onPress={() => {
                  haptics.selection();
                  setAccountId(a.id);
                  setPicker(null);
                }}
              />
            ))}
          </View>
        ) : null}
        {picker === 'date' ? (
          <Calendar
            value={anchorDate}
            today={data.today}
            onChange={(day) => {
              setAnchorDate(day);
              setDateTouched(true);
              setPicker(null);
            }}
          />
        ) : null}
        {anchorDate <= data.today ? (
          <AppText variant="footnote" tone="warning" style={{ textAlign: 'center' }}>
            {it.subscriptionForm.pastDate}
          </AppText>
        ) : null}

        <AmountDisplay
          input={input}
          label={name || it.subscriptionForm.title}
          caption={
            !amountMinor
              ? undefined
              : frequency.unit === 'month' && frequency.interval === 1
                ? it.subscriptionForm.costYear(money(yearlyEquivalent(sample)))
                : it.subscriptionForm.cost(money(monthlyEquivalent(sample)), money(yearlyEquivalent(sample)))
          }
        />

        {!template || editing ? <TextField label={it.subscriptionForm.name} value={name} onChangeText={setName} placeholder={it.subscriptionForm.namePlaceholder} /> : null}

        <ChoiceRow label={it.subscriptionForm.frequency}>
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => (
            <Chip
              key={key}
              label={it.subscriptionForm.frequencies[key]}
              selected={preset === key}
              onPress={() => {
                haptics.selection();
                setCustom(false);
                changeFrequency(PRESETS[key]);
              }}
            />
          ))}
          <Chip
            label={it.subscriptionForm.frequencies.custom}
            selected={preset === 'custom'}
            onPress={() => {
              haptics.selection();
              setCustom(true);
            }}
          />
        </ChoiceRow>
        {preset === 'custom' ? (
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              {stepper(-1)}
              <AppText variant="bodyStrong" accessibilityLiveRegion="polite" style={{ minWidth: 140, textAlign: 'center' }}>
                {frequencyLabel(frequency)}
              </AppText>
              {stepper(1)}
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {UNITS.map((unit) => (
                <Chip
                  key={unit}
                  label={it.frequency.units[unit].many}
                  selected={frequency.unit === unit}
                  onPress={() => {
                    haptics.selection();
                    changeFrequency({ ...frequency, unit });
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <ChoiceRow label={it.subscriptionForm.category}>
          {categories.map((c) => (
            <Chip
              key={c.id}
              label={c.name}
              selected={c.id === categoryId}
              onPress={() => {
                haptics.selection();
                setCategoryId(c.id);
              }}
              leading={<LineBadge color={c.color} name={c.name} size={28} />}
            />
          ))}
          <Chip label={allCategories ? it.add.lessCategories : it.add.allCategories} onPress={() => setAllCategories(!allCategories)} />
        </ChoiceRow>
      </ScrollView>
      <SaveBar
        onKey={(key) => setInput((current) => appendKeypadKey(current, key))}
        onClear={() => setInput('')}
        label={missing ?? (editing ? it.add.saveChanges : `${it.add.save} ${money(amountMinor)}`)}
        ready={!missing}
        busy={addSubscription.isPending || updateSubscription.isPending}
        onSave={save}
      />
      <ToastHost top={60} />
    </View>
  );
}
