import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { AppState, BackHandler, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { PinDots, PinPad } from '@/components/pin-pad';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { announce, useAnnounce } from '@/services/a11y';
import { haptics } from '@/services/haptics';
import { biometricSupport, checkPin, confirmWithBiometrics } from '@/services/security';
import { useLock } from '@/state/lock';
import { useSettings } from '@/state/settings';
import { layout, radius, spacing, useTheme } from '@/theme';

/** Before the lockout starts, how many wrong PINs are still allowed. */
const FREE_ATTEMPTS = 4;

function formatWait(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * Watches the app going to the background and coming back; after the chosen delay it locks, and
 * the lock screen goes on top of whatever was open, sheets included, so nothing is lost on unlock.
 */
export function LockGate() {
  const hasPin = useSettings((s) => s.pin !== null);
  const autoLock = useSettings((s) => s.autoLock);
  const locked = useLock((s) => s.locked);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') useLock.getState().wentToBackground(Date.now());
      if (state === 'active') useLock.getState().cameBack(Date.now(), autoLock, hasPin);
    });
    return () => subscription.remove();
  }, [autoLock, hasPin]);

  useEffect(() => {
    if (locked) router.push('/lock');
  }, [locked]);

  return null;
}

/** The lock screen: no amount, no content. Face or fingerprint first if chosen, the PIN always. */
export function LockScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pin = useSettings((s) => s.pin);
  const biometrics = useSettings((s) => s.biometrics);
  const startHidden = useSettings((s) => s.startHidden);
  const setPrivacy = useSettings((s) => s.setPrivacy);
  const { failedAttempts, lockedOutUntil, fail, unlock } = useLock();
  // Locked since the start: the root layout hides the splash screen once this screen is shown.
  // Should that signal never come, the splash screen goes anyway: never an app stuck on it.
  useEffect(() => {
    if (!useLock.getState().coldStart) return;
    const fallback = setTimeout(() => void SplashScreen.hideAsync(), 2000);
    return () => clearTimeout(fallback);
  }, []);
  const { data: kind = null } = useQuery({ queryKey: ['biometric-support'], queryFn: biometricSupport, staleTime: Infinity });
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  // The countdown reads the clock, ticking once a second.
  const [now, setNow] = useState(() => Date.now());
  const waitMs = lockedOutUntil ? Math.max(0, lockedOutUntil - now) : 0;
  const canUseBiometrics = biometrics && kind !== null;

  const done = () => {
    haptics.success();
    if (startHidden) setPrivacy(true);
    unlock();
    if (router.canGoBack()) router.back();
  };

  // Nothing to unlock with (the PIN was removed): just go back.
  useEffect(() => {
    if (!pin) {
      unlock();
      if (router.canGoBack()) router.back();
    }
  }, [pin, unlock]);

  // Android back button: the lock screen cannot be dismissed.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!lockedOutUntil) return;
    announce(it.lock.wait(formatWait(lockedOutUntil - Date.now())));
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [lockedOutUntil]);

  useAnnounce(error);

  const askBiometrics = async () => {
    if (await confirmWithBiometrics(it.lock.prompt, it.common.cancel)) done();
  };

  // Ask for the face or the fingerprint as soon as the screen shows.
  useEffect(() => {
    if (!canUseBiometrics || AppState.currentState !== 'active') return;
    let cancelled = false;
    confirmWithBiometrics(it.lock.prompt, it.common.cancel).then((ok) => {
      if (ok && !cancelled) done();
    });
    return () => {
      cancelled = true;
    };
    // Once per showing of the lock screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUseBiometrics]);

  const onDigit = async (digit: string) => {
    if (!pin || checking || waitMs > 0 || digits.length >= pin.length) return;
    const value = digits + digit;
    setDigits(value);
    setError(null);
    if (value.length < pin.length) return;
    setChecking(true);
    const ok = await checkPin(value, pin);
    setChecking(false);
    if (ok) return done();
    haptics.warning();
    const at = Date.now();
    fail(at);
    setNow(at);
    setDigits('');
    setError(it.lock.wrong(Math.max(0, FREE_ATTEMPTS - (failedAttempts + 1))));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingHorizontal: spacing.gutter, justifyContent: 'space-between', gap: spacing.lg }}
      >
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View style={{ width: 56, height: 56, borderRadius: radius.sign, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="LockSimple" size={28} color={colors.onInk} weight="bold" />
          </View>
          <AppText variant="title2" accessibilityRole="header">
            {it.lock.title}
          </AppText>
          <PinDots slots={pin?.length ?? 4} filled={digits.length} />
          <AppText
            variant="footnote"
            tone={waitMs > 0 ? 'warning' : 'alert'}
            // The countdown changes every second: only the errors are read as they come.
            accessibilityLiveRegion={waitMs > 0 ? 'none' : 'polite'}
            style={{ textAlign: 'center', minHeight: 36 }}
          >
            {waitMs > 0 ? it.lock.wait(formatWait(waitMs)) : (error ?? '')}
          </AppText>
        </View>
        <View style={{ gap: spacing.lg }}>
          <PinPad onDigit={onDigit} onBack={() => setDigits((d) => d.slice(0, -1))} disabled={waitMs > 0} />
          {canUseBiometrics && kind ? (
            <Button label={it.lock.useBiometrics[kind]} icon={kind === 'face' ? 'ScanSmiley' : 'Fingerprint'} variant="secondary" onPress={askBiometrics} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
