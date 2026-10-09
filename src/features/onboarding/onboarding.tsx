import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { SettingsGroup, SettingsInfoRow, SettingsSwitchRow } from '@/components/settings-group';
import { AppText } from '@/components/text';
import { CASH } from '@/data/defaults';
import { useSaveAccount, useSaveBudget, useSnapshot } from '@/data/queries';
import { appendKeypadKey, cleanAmountText, inputToMinor } from '@/domain/money';
import type { AccountType, Id } from '@/domain/types';
import { AmountDisplay, ChoiceRow, SaveBar, TextField } from '@/features/add/form-parts';
import { it } from '@/i18n/it';
import { usePermissionChange } from '@/features/notifications/notifications-planner';
import { haptics } from '@/services/haptics';
import { askForNotifications } from '@/services/notifications';
import { useSettings } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, radius, spacing, useTheme } from '@/theme';

type Step = 'currency' | 'account' | 'budget' | 'privacy';
const STEPS: Step[] = ['currency', 'account', 'budget', 'privacy'];

/** What the onboarding already wrote, so going back and forth updates instead of duplicating. */
const useOnboardingDraft = create<{ accountId: Id | null; budgetId: Id | null; set: (draft: { accountId?: Id; budgetId?: Id }) => void }>((set) => ({
  accountId: null,
  budgetId: null,
  set: (draft) => set(draft),
}));

/** The steps as a metro line: stops passed are filled, the current one is a ring. */
function StepLine({ step }: { step: Step }) {
  const { colors } = useTheme();
  const index = STEPS.indexOf(step);
  const stop = (i: number) => (
    <View
      key={`stop-${i}`}
      style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 3, borderColor: i <= index ? colors.ink : colors.track, backgroundColor: i < index ? colors.ink : colors.background }}
    />
  );
  const segment = (i: number) => <View key={`segment-${i}`} style={{ flex: 1, height: 4, backgroundColor: i < index ? colors.ink : colors.track }} />;
  return (
    <View accessible accessibilityLabel={it.onboarding.progress(index + 1, STEPS.length, it.onboarding.steps[step])} style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>{STEPS.flatMap((_, i) => (i === 0 ? [stop(i)] : [segment(i - 1), stop(i)]))}</View>
      <AppText variant="caption" tone="secondary">
        {it.onboarding.progress(index + 1, STEPS.length, it.onboarding.steps[step])}
      </AppText>
    </View>
  );
}

/** The frame of a step: line, title, body, content; the footer holds the main action. */
function StepFrame({ step, title, body, children, footer, onSkip }: { step: Step; title: string; body: string; children?: ReactNode; footer: ReactNode; onSkip?: () => void }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.sm }}>
      <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.sm, minHeight: 44 }}>
          {router.canGoBack() ? (
            <PressableScale accessibilityRole="button" accessibilityLabel={it.common.back} feedback="dim" onPress={() => router.back()} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="CaretLeft" size={22} color={colors.ink} weight="bold" />
            </PressableScale>
          ) : (
            <View />
          )}
          {onSkip ? (
            <PressableScale accessibilityRole="button" feedback="dim" onPress={onSkip} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm }}>
              <AppText variant="callout">{it.onboarding.skip}</AppText>
            </PressableScale>
          ) : null}
        </View>
        <ScrollView automaticallyAdjustKeyboardInsets style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: spacing.lg, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          <StepLine step={step} />
          <View style={{ gap: spacing.sm }}>
            <AppText variant="title1" accessibilityRole="header">
              {title}
            </AppText>
            <AppText variant="body" tone="secondary">
              {body}
            </AppText>
          </View>
          {children}
        </ScrollView>
        {footer}
      </View>
    </View>
  );
}

function FooterButton({ label, onPress, busy }: { label: string; onPress: () => void; busy?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: spacing.gutter, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md }}>
      <Button label={label} onPress={onPress} busy={busy} />
    </View>
  );
}

const PROMISE_ICONS: IconName[] = ['DeviceMobile', 'EyeSlash', 'Export'];
const WELCOME_LINES = ['green', 'yellow', 'sky', 'magenta'];

/** Benvenuto: what the app is in one line, three promises, start or restore. */
export function WelcomeScreen() {
  const { colors, lineColor } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.md }}>
      <ScrollView automaticallyAdjustKeyboardInsets
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.gutter, justifyContent: 'space-between', gap: spacing.xl }}
      >
        <View style={{ gap: spacing.xl }}>
          <View style={{ gap: 5 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {WELCOME_LINES.map((key, i) => (
              <View key={key} style={{ height: 7, width: `${88 - i * 14}%`, borderRadius: radius.full, backgroundColor: lineColor(key).fill }} />
            ))}
          </View>
          <View style={{ gap: spacing.smd }}>
            <AppText variant="title1" accessibilityRole="header">
              {it.onboarding.welcome.title}
            </AppText>
            <AppText variant="body" tone="secondary">
              {it.onboarding.welcome.body}
            </AppText>
          </View>
          <View style={{ gap: spacing.md }}>
            {it.onboarding.welcome.promises.map((line, i) => (
              <View key={line} style={{ flexDirection: 'row', gap: spacing.smd, alignItems: 'center' }}>
                <Icon name={PROMISE_ICONS[i]} size={22} color={colors.ink} />
                <AppText variant="callout" style={{ flex: 1 }}>
                  {line}
                </AppText>
              </View>
            ))}
          </View>
        </View>
        <View style={{ gap: spacing.sm }}>
          <Button label={it.onboarding.welcome.start} onPress={() => router.push('/onboarding/currency')} />
          <Button label={it.onboarding.welcome.restore} icon="ArrowCounterClockwise" variant="secondary" onPress={() => router.push('/restore')} />
        </View>
      </ScrollView>
    </View>
  );
}

export function CurrencyStep() {
  return (
    <StepFrame step="currency" title={it.onboarding.currency.title} body={it.onboarding.currency.body} footer={<FooterButton label={it.onboarding.next} onPress={() => router.push('/onboarding/account')} />}>
      <SettingsGroup>
        <SettingsInfoRow icon="CurrencyEur" title={it.currencySettings.euro} value="1.284,62 €" />
      </SettingsGroup>
    </StepFrame>
  );
}

const TYPES: AccountType[] = ['bank', 'ewallet', 'cash', 'credit_card'];
const TYPE_COLORS: Record<AccountType, string> = { bank: 'blue', ewallet: 'sky', cash: 'green', credit_card: 'slate', savings: 'olive', other: 'grey' };

/** Primo conto: type, name and today's balance. Skipping creates "Contanti" at zero. */
export function AccountStep() {
  const { data } = useSnapshot();
  const save = useSaveAccount();
  const draft = useOnboardingDraft();
  const existing = data?.accounts.find((a) => a.id === draft.accountId);
  const [type, setType] = useState<AccountType>(existing?.type ?? 'bank');
  const [name, setName] = useState(existing?.name ?? it.onboarding.account.defaultNames.bank);
  const [input, setInput] = useState('');
  const [named, setNamed] = useState(Boolean(existing));

  const store = (fields: { name: string; type: AccountType; openingBalanceMinor: number; color: string }) => {
    save.mutate(
      { ...(existing ?? { currency: data?.currency ?? 'EUR', includeInTotal: true, archived: false, sortOrder: 0 }), ...fields },
      {
        onSuccess: (account) => {
          draft.set({ accountId: account.id });
          router.push('/onboarding/budget');
        },
      },
    );
  };
  const onNext = () => store({ name: name.trim() || it.onboarding.account.defaultNames[type], type, openingBalanceMinor: inputToMinor(input), color: TYPE_COLORS[type] });
  const onSkip = () => {
    if (existing) return router.push('/onboarding/budget');
    store({ name: CASH.name, type: CASH.type, openingBalanceMinor: 0, color: CASH.color });
  };

  return (
    <StepFrame
      step="account"
      title={it.onboarding.account.title}
      body={it.onboarding.account.body}
      onSkip={onSkip}
      footer={<FooterButton label={it.onboarding.next} onPress={onNext} busy={save.isPending} />}
    >
      <ChoiceRow label={it.accounts.form.type}>
        {TYPES.map((t) => (
          <Chip
            key={t}
            label={it.accounts.types[t]}
            selected={t === type}
            onPress={() => {
              haptics.selection();
              setType(t);
              // Until the user types a name, the name follows the type.
              if (!named) setName(it.onboarding.account.defaultNames[t]);
            }}
          />
        ))}
      </ChoiceRow>
      <TextField
        label={it.accounts.form.name}
        value={name}
        onChangeText={(text) => {
          setNamed(true);
          setName(text);
        }}
      />
      <TextField label={`${it.onboarding.account.balance} (€)`} value={input} onChangeText={(text) => setInput(cleanAmountText(text))} placeholder="0" keyboardType="decimal-pad" />
      <AppText variant="footnote" tone="tertiary">
        {it.onboarding.account.skipHint}
      </AppText>
    </StepFrame>
  );
}

/** Budget del mese: the month's terminus. Skippable. */
export function BudgetStep() {
  const { data } = useSnapshot();
  const save = useSaveBudget();
  const draft = useOnboardingDraft();
  const [input, setInput] = useState('');
  const amountMinor = inputToMinor(input);

  const onNext = () => {
    if (!data || !amountMinor) return router.push('/onboarding/privacy');
    save.mutate(
      { id: draft.budgetId ?? undefined, scope: 'global', amountMinor, currency: data.currency, fromMonth: data.today.slice(0, 7) },
      {
        onSuccess: (budget) => {
          draft.set({ budgetId: budget.id });
          router.push('/onboarding/privacy');
        },
      },
    );
  };

  return (
    <StepFrame
      step="budget"
      title={it.onboarding.budget.title}
      body={it.onboarding.budget.body}
      onSkip={() => router.push('/onboarding/privacy')}
      footer={
        <SaveBar
          onKey={(key) => setInput((value) => appendKeypadKey(value, key))}
          onClear={() => setInput('')}
          label={it.onboarding.next}
          ready
          busy={save.isPending}
          onSave={onNext}
        />
      }
    >
      <AmountDisplay input={input} label={it.onboarding.steps.budget} />
    </StepFrame>
  );
}

/** Privacy: PIN, hidden amounts at start, app switcher cover. Then the Home, empty, with the +. */
export function PrivacyStep() {
  const pin = useSettings((s) => s.pin);
  const startHidden = useSettings((s) => s.startHidden);
  const cover = useSettings((s) => s.coverInSwitcher);
  const setStartHidden = useSettings((s) => s.setStartHidden);
  const setCover = useSettings((s) => s.setCoverInSwitcher);
  const setOnboarded = useSettings((s) => s.setOnboarded);
  const showToast = useToast((s) => s.show);
  const [asking, setAsking] = useState(false);

  const finish = async () => {
    if (asking) return;
    // The system asks about notifications once, here: the rules on by default need it.
    setAsking(true);
    const allowed = await askForNotifications().catch((error: unknown) => {
      if (__DEV__) console.warn('Notification permission not asked', error);
      return false;
    });
    if (allowed) usePermissionChange.getState().changed();
    setAsking(false);
    haptics.success();
    useOnboardingDraft.setState({ accountId: null, budgetId: null });
    setOnboarded(true);
    showToast({ text: it.onboarding.ready });
  };

  return (
    <StepFrame step="privacy" title={it.onboarding.privacy.title} body={it.onboarding.privacy.body} footer={<FooterButton label={it.onboarding.privacy.done} onPress={finish} busy={asking} />}>
      <SettingsGroup footer={it.onboarding.privacy.notifications}>
        <SettingsSwitchRow
          icon="LockSimple"
          title={it.security.lock}
          hint={it.security.lockHint}
          value={pin !== null}
          onValueChange={(on) => router.push({ pathname: '/settings/pin', params: { mode: on ? 'set' : 'disable' } })}
        />
        <SettingsSwitchRow icon="EyeSlash" title={it.privacySettings.startHidden} hint={it.privacySettings.startHiddenHint} value={startHidden} onValueChange={setStartHidden} />
        <SettingsSwitchRow icon="DeviceMobile" title={it.privacySettings.cover} value={cover} onValueChange={setCover} />
      </SettingsGroup>
    </StepFrame>
  );
}
