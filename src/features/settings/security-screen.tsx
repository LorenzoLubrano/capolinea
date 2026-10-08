import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsRow, SettingsSwitchRow } from '@/components/settings-group';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { pinProblem } from '@/domain/pin';
import { it } from '@/i18n/it';
import { haptics } from '@/services/haptics';
import { biometricSupport, checkPin, confirmWithBiometrics, hashPin } from '@/services/security';
import { useSettings, type AutoLock } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, radius, spacing, useTheme } from '@/theme';

const AUTO_LOCK: AutoLock[] = ['immediate', '1m', '5m', '15m'];

/** Sicurezza: the PIN lock, unlocking with face or fingerprint, and how soon the app locks again. */
export function SecurityScreen() {
  const pin = useSettings((s) => s.pin);
  const biometrics = useSettings((s) => s.biometrics);
  const autoLock = useSettings((s) => s.autoLock);
  const setBiometrics = useSettings((s) => s.setBiometrics);
  const setAutoLock = useSettings((s) => s.setAutoLock);
  const showToast = useToast((s) => s.show);
  const { data: kind = null } = useQuery({ queryKey: ['biometric-support'], queryFn: biometricSupport, staleTime: Infinity });

  const onBiometrics = async (on: boolean) => {
    if (!on) return setBiometrics(false);
    if (await confirmWithBiometrics(it.security.biometricsPrompt, it.common.cancel)) {
      haptics.success();
      setBiometrics(true);
      showToast({ text: it.security.biometricsOn });
    }
  };

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <SettingsGroup footer={it.security.footer}>
          <SettingsSwitchRow
            icon="LockSimple"
            title={it.security.lock}
            hint={it.security.lockHint}
            value={pin !== null}
            onValueChange={(on) => router.push({ pathname: '/settings/pin', params: { mode: on ? 'set' : 'disable' } })}
          />
          {pin ? (
            <SettingsSwitchRow
              icon={kind === 'face' ? 'ScanSmiley' : 'Fingerprint'}
              title={it.security.biometrics[kind ?? 'unknown']}
              hint={kind ? it.security.biometricsHint : it.security.biometricsUnavailable}
              value={biometrics && kind !== null}
              disabled={kind === null}
              onValueChange={onBiometrics}
            />
          ) : null}
          {pin ? <SettingsRow icon="PencilSimple" title={it.security.changePin} onPress={() => router.push({ pathname: '/settings/pin', params: { mode: 'change' } })} /> : null}
        </SettingsGroup>

        {pin ? (
          <SettingsGroup title={it.security.autoLock} footer={it.security.autoLockHint}>
            {AUTO_LOCK.map((option) => (
              <SettingsRow
                key={option}
                role="radio"
                checked={autoLock === option}
                title={it.security.autoLockOptions[option]}
                onPress={() => {
                  haptics.selection();
                  setAutoLock(option);
                }}
              />
            ))}
          </SettingsGroup>
        ) : null}
      </View>
    </Screen>
  );
}

type Mode = 'set' | 'change' | 'disable';
type Step = 'current' | 'new' | 'confirm';
const MAX_DIGITS = 6;
const MIN_DIGITS = 4;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

/** Digits only, large keys, no comma: the PIN pad. */
function PinPad({ onDigit, onBack }: { onDigit: (digit: string) => void; onBack: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: spacing.smd, columnGap: spacing.lg, maxWidth: 3 * 76 + 2 * spacing.lg, alignSelf: 'center' }}>
      {KEYS.map((key, i) =>
        key === '' ? (
          <View key={i} style={{ width: 76, height: 76 }} />
        ) : (
          <PressableScale
            key={i}
            accessibilityRole="button"
            accessibilityLabel={key === 'back' ? it.pin.delete : key}
            onPress={() => (key === 'back' ? onBack() : onDigit(key))}
            style={{ width: 76, height: 76, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: key === 'back' ? 'transparent' : colors.surfaceMuted }}
          >
            {key === 'back' ? <Icon name="Backspace" size={26} color={colors.ink} /> : <AppText variant="key">{key}</AppText>}
          </PressableScale>
        ),
      )}
    </View>
  );
}

/** Set, change or remove the PIN. The PIN is hashed with a salt as soon as it is confirmed. */
export function PinSheet() {
  const { colors } = useTheme();
  const { mode: rawMode } = useLocalSearchParams<{ mode?: Mode }>();
  const mode: Mode = rawMode === 'change' || rawMode === 'disable' ? rawMode : 'set';
  const saved = useSettings((s) => s.pin);
  const setPin = useSettings((s) => s.setPin);
  const showToast = useToast((s) => s.show);
  const [step, setStep] = useState<Step>(mode === 'set' || !saved ? 'new' : 'current');
  const [digits, setDigits] = useState('');
  const [chosen, setChosen] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const expected = step === 'current' ? (saved?.length ?? MAX_DIGITS) : step === 'confirm' ? chosen.length : MAX_DIGITS;
  const slots = step === 'new' ? Math.max(MIN_DIGITS, digits.length) : expected;

  const fail = (message: string) => {
    haptics.warning();
    setError(message);
    setDigits('');
  };
  const finish = (text: string) => {
    haptics.success();
    router.back();
    showToast({ text });
  };

  const verify = async (value: string) => {
    if (!saved) return;
    setBusy(true);
    const ok = await checkPin(value, saved);
    setBusy(false);
    if (!ok) return fail(it.pin.errors.wrong);
    if (mode === 'disable') {
      setPin(null);
      return finish(it.security.lockOff);
    }
    setDigits('');
    setStep('new');
  };
  const confirm = async (value: string) => {
    if (value !== chosen) {
      setChosen('');
      setStep('new');
      return fail(it.pin.errors.mismatch);
    }
    setBusy(true);
    setPin(await hashPin(value));
    setBusy(false);
    finish(mode === 'change' ? it.security.pinChanged : it.security.lockOn);
  };
  const next = () => {
    if (pinProblem(digits)) return fail(it.pin.errors.weak);
    setChosen(digits);
    setDigits('');
    setError(null);
    setStep('confirm');
  };

  const onDigit = (digit: string) => {
    if (busy || digits.length >= expected) return;
    const value = digits + digit;
    setDigits(value);
    setError(null);
    if (step === 'current' && value.length === expected) verify(value);
    if (step === 'confirm' && value.length === expected) confirm(value);
  };

  return (
    <View style={{ flex: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' }}>
      <SheetHeader title="" left={{ label: it.common.cancel, onPress: () => router.back() }} right={step === 'new' && digits.length >= MIN_DIGITS ? { label: it.pin.next, onPress: next } : undefined} />
      <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, paddingBottom: spacing.xl }}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <AppText variant="title2" accessibilityRole="header">
            {it.pin.titles[step]}
          </AppText>
          <AppText variant="subhead" tone="secondary" style={{ textAlign: 'center' }}>
            {it.pin.hints[step]}
          </AppText>
          <View accessible accessibilityLabel={it.pin.typed(digits.length)} style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.lg }}>
            {Array.from({ length: slots }, (_, i) => (
              <View key={i} style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.ink, backgroundColor: i < digits.length ? colors.ink : 'transparent' }} />
            ))}
          </View>
          <AppText variant="footnote" tone="alert" accessibilityLiveRegion="polite" style={{ textAlign: 'center', minHeight: 36 }}>
            {error ?? ''}
          </AppText>
        </View>
        <PinPad onDigit={onDigit} onBack={() => setDigits((d) => d.slice(0, -1))} />
      </View>
      <ToastHost top={60} />
    </View>
  );
}
