import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PinDots, PinPad } from '@/components/pin-pad';
import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsRow, SettingsSwitchRow } from '@/components/settings-group';
import { SheetHeader } from '@/components/sheet-header';
import { AppText } from '@/components/text';
import { ToastHost } from '@/components/toast-host';
import { pinProblem } from '@/domain/pin';
import { it } from '@/i18n/it';
import { useAnnounce } from '@/services/a11y';
import { haptics } from '@/services/haptics';
import { biometricSupport, checkPin, confirmWithBiometrics, hashPin } from '@/services/security';
import { useLock } from '@/state/lock';
import { useSettings, type AutoLock } from '@/state/settings';
import { useToast } from '@/state/toast';
import { layout, spacing } from '@/theme';

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
          {pin ? <SettingsRow icon="LockSimple" title={it.lock.now} hint={it.lock.nowHint} onPress={() => useLock.getState().lock()} /> : null}
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
/** Set, change or remove the PIN. The PIN is hashed with a salt as soon as it is confirmed. */
export function PinSheet() {
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

  useAnnounce(error);

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
          <PinDots slots={slots} filled={digits.length} />
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
