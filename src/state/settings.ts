import { Platform } from 'react-native';
import { create, type StateCreator } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { AutoLock } from '@/domain/lock';
import { SECRET_KEYS, secrets, settingsStorage, type SecretStore, type SyncStorage } from '@/services/device-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Home backdrop: a piece of the metro map (default) or soft glows. */
export type HomeBackdrop = 'map' | 'glow';

export type { AutoLock };

/** A PIN is never kept in clear: only a salted SHA-256 and its length (to draw the dots). */
export interface PinRecord {
  hash: string;
  salt: string;
  length: number;
}

/** Local notification rules. Thresholds are chosen in Impostazioni › Notifiche. */
export interface NotificationRules {
  budgetNear: boolean;
  budgetNearThreshold: number;
  budgetOver: boolean;
  subscriptionSoon: boolean;
  subscriptionDaysBefore: number;
  chargeCreated: boolean;
  largeExpense: boolean;
  largeExpenseMinor: number;
  weeklySummary: boolean;
  monthlySummary: boolean;
  eveningReminder: boolean;
  goals: boolean;
}

export const DEFAULT_NOTIFICATIONS: NotificationRules = {
  budgetNear: true,
  budgetNearThreshold: 80,
  budgetOver: true,
  subscriptionSoon: true,
  subscriptionDaysBefore: 1,
  chargeCreated: false,
  largeExpense: false,
  largeExpenseMinor: 10000,
  weeklySummary: false,
  monthlySummary: true,
  eveningReminder: false,
  goals: true,
};

interface SettingsState {
  /** Privacy mode: every amount in the app is hidden. */
  privacy: boolean;
  themeMode: ThemeMode;
  homeBackdrop: HomeBackdrop;
  /** The lock is on when a PIN exists. */
  pin: PinRecord | null;
  biometrics: boolean;
  autoLock: AutoLock;
  /** Privacy mode turns on every time the app is unlocked. */
  startHidden: boolean;
  /** The app switcher shows a cover instead of the screen (Android: also no screenshots). */
  coverInSwitcher: boolean;
  notifications: NotificationRules;
  /** False on a first launch or after wiping the data: the app shows the onboarding. */
  onboarded: boolean;
  togglePrivacy: () => void;
  setPrivacy: (privacy: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHomeBackdrop: (backdrop: HomeBackdrop) => void;
  /** `null` turns the lock off, and biometrics with it. */
  setPin: (pin: PinRecord | null) => void;
  setBiometrics: (on: boolean) => void;
  setAutoLock: (autoLock: AutoLock) => void;
  setStartHidden: (on: boolean) => void;
  setCoverInSwitcher: (on: boolean) => void;
  setNotifications: (changes: Partial<NotificationRules>) => void;
  /** Wiping the local data also forgets the lock. Appearance stays. */
  resetSecurity: () => void;
  setOnboarded: (onboarded: boolean) => void;
}

/** What survives a restart in the settings file. The PIN is not here: it lives in the secure store. */
type Persisted = Pick<
  SettingsState,
  'privacy' | 'themeMode' | 'homeBackdrop' | 'biometrics' | 'autoLock' | 'startHidden' | 'coverInSwitcher' | 'notifications' | 'onboarded'
>;

const SETTINGS_KEY = 'capolinea.settings';

const isPinRecord = (value: unknown): value is PinRecord =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as PinRecord).hash === 'string' &&
  typeof (value as PinRecord).salt === 'string' &&
  typeof (value as PinRecord).length === 'number';

function readPin(store: SecretStore): PinRecord | null {
  try {
    const value: unknown = JSON.parse(store.get(SECRET_KEYS.pin) ?? 'null');
    return isPinRecord(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * UI preferences. Financial data never lives here: it comes from the repositories.
 * Settings are kept in `storage` (none: only for the session); the PIN record in `secrets`.
 */
export function createSettingsStore({ storage, secrets: store, onboardedByDefault }: { storage: SyncStorage | null; secrets: SecretStore; onboardedByDefault: boolean }) {
  // A new install has no settings yet: secrets still in the iOS keychain belong to an earlier one.
  if (storage && storage.getItem(SETTINGS_KEY) === null) for (const key of Object.values(SECRET_KEYS)) store.set(key, 'null');
  const savePin = (pin: PinRecord | null) => store.set(SECRET_KEYS.pin, JSON.stringify(pin));

  const settings: StateCreator<SettingsState> = (set) => ({
    privacy: false,
    themeMode: 'system',
    homeBackdrop: 'map',
    pin: readPin(store),
    biometrics: false,
    autoLock: '1m',
    startHidden: false,
    coverInSwitcher: true,
    notifications: DEFAULT_NOTIFICATIONS,
    onboarded: onboardedByDefault,
    togglePrivacy: () => set((state) => ({ privacy: !state.privacy })),
    setPrivacy: (privacy) => set({ privacy }),
    setThemeMode: (themeMode) => set({ themeMode }),
    setHomeBackdrop: (homeBackdrop) => set({ homeBackdrop }),
    setPin: (pin) => {
      savePin(pin);
      set(pin ? { pin } : { pin: null, biometrics: false });
    },
    setBiometrics: (biometrics) => set({ biometrics }),
    setAutoLock: (autoLock) => set({ autoLock }),
    setStartHidden: (startHidden) => set({ startHidden }),
    setCoverInSwitcher: (coverInSwitcher) => set({ coverInSwitcher }),
    setNotifications: (changes) => set((state) => ({ notifications: { ...state.notifications, ...changes } })),
    resetSecurity: () => {
      savePin(null);
      set({ pin: null, biometrics: false, autoLock: '1m', startHidden: false });
    },
    setOnboarded: (onboarded) => set({ onboarded }),
  });

  if (!storage) return create<SettingsState>()(settings);
  return create<SettingsState>()(
    persist(settings, {
      name: SETTINGS_KEY,
      version: 1,
      storage: createJSONStorage(() => storage),
      partialize: (state): Persisted => ({
        privacy: state.privacy,
        themeMode: state.themeMode,
        homeBackdrop: state.homeBackdrop,
        biometrics: state.biometrics,
        autoLock: state.autoLock,
        startHidden: state.startHidden,
        coverInSwitcher: state.coverInSwitcher,
        notifications: state.notifications,
        onboarded: state.onboarded,
      }),
      // A rule added by a later version is missing from older settings: it takes its default.
      merge: (saved, current) => {
        const old = (saved ?? {}) as Partial<Persisted>;
        return { ...current, ...old, notifications: { ...current.notifications, ...old.notifications } };
      },
    }),
  );
}

/** The web preview opens on the example data, as if the onboarding were done; the phone on its own. */
export const useSettings = createSettingsStore({ storage: settingsStorage, secrets, onboardedByDefault: Platform.OS === 'web' });
