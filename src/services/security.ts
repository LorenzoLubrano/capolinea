import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { PinRecord } from '@/state/settings';

const native = Platform.OS === 'ios' || Platform.OS === 'android';

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Salted SHA-256 of a PIN. Never stored or logged in clear. */
export async function hashPin(pin: string, salt = toHex(Crypto.getRandomBytes(16))): Promise<PinRecord> {
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
  return { hash, salt, length: pin.length };
}

/** Compares in constant time, so the time taken says nothing about how many characters matched. */
export async function checkPin(pin: string, record: PinRecord): Promise<boolean> {
  const { hash } = await hashPin(pin, record.salt);
  if (hash.length !== record.hash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ record.hash.charCodeAt(i);
  return diff === 0;
}

export type BiometricKind = 'face' | 'fingerprint' | 'iris';

/**
 * Whether the phone can unlock with a face, a fingerprint or an iris, and has one enrolled. Only
 * strong biometrics count: on Android a camera face unlock is often weak, fooled by a photo.
 */
export async function biometricSupport(): Promise<BiometricKind | null> {
  if (!native) return null;
  try {
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return null;
    if ((await LocalAuthentication.getEnrolledLevelAsync()) < LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG) return null;
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    // Android does not say which kind is the strong one: a fingerprint sensor nearly always is.
    if (Platform.OS === 'android' && types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'face';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) return 'fingerprint';
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) return 'iris';
    return null;
  } catch {
    return null;
  }
}

/** Asks for the face or the fingerprint, strong kinds only. The app's own PIN is the fallback, never the phone's code. */
export async function confirmWithBiometrics(promptMessage: string, cancelLabel: string): Promise<boolean> {
  if (!native) return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong',
    });
    return result.success;
  } catch {
    return false;
  }
}

/**
 * Covers the app in the app switcher: iOS blurs the snapshot; Android marks the window secure,
 * which also blocks screenshots of the app. Nothing on the web.
 */
export function useAppSwitcherCover(enabled: boolean) {
  useEffect(() => {
    if (!native || !enabled) return;
    const on = Platform.OS === 'ios' ? ScreenCapture.enableAppSwitcherProtectionAsync(0.9) : ScreenCapture.preventScreenCaptureAsync('app-switcher');
    on.catch(() => {});
    return () => {
      const off = Platform.OS === 'ios' ? ScreenCapture.disableAppSwitcherProtectionAsync() : ScreenCapture.allowScreenCaptureAsync('app-switcher');
      off.catch(() => {});
    };
  }, [enabled]);
}
