import { create } from 'zustand';

import type { AutoLock } from '@/domain/lock';

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

/**
 * UI preferences. Financial data never lives here: it comes from the repositories.
 * Phase 1 keeps them in memory; phase 2 moves the PIN to SecureStore and the rest to the database.
 */
export const useSettings = create<SettingsState>((set) => ({
  privacy: false,
  themeMode: 'system',
  homeBackdrop: 'map',
  pin: null,
  biometrics: false,
  autoLock: '1m',
  startHidden: false,
  coverInSwitcher: true,
  notifications: DEFAULT_NOTIFICATIONS,
  // The prototype opens on the example data, as if the onboarding were done.
  onboarded: true,
  togglePrivacy: () => set((state) => ({ privacy: !state.privacy })),
  setPrivacy: (privacy) => set({ privacy }),
  setThemeMode: (themeMode) => set({ themeMode }),
  setHomeBackdrop: (homeBackdrop) => set({ homeBackdrop }),
  setPin: (pin) => set(pin ? { pin } : { pin: null, biometrics: false }),
  setBiometrics: (biometrics) => set({ biometrics }),
  setAutoLock: (autoLock) => set({ autoLock }),
  setStartHidden: (startHidden) => set({ startHidden }),
  setCoverInSwitcher: (coverInSwitcher) => set({ coverInSwitcher }),
  setNotifications: (changes) => set((state) => ({ notifications: { ...state.notifications, ...changes } })),
  resetSecurity: () => set({ pin: null, biometrics: false, autoLock: '1m', startHidden: false }),
  setOnboarded: (onboarded) => set({ onboarded }),
}));
