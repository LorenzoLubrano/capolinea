import { create } from 'zustand';

import { lockoutMs, shouldLockOnReturn, type AutoLock } from '@/domain/lock';
import { SECRET_KEYS, secrets, type SecretStore } from '@/services/device-storage';

import { useSettings } from './settings';

interface LockState {
  locked: boolean;
  /** Locked since the app started: nothing of the app has been shown yet. */
  coldStart: boolean;
  /** When the app last went to the background, epoch ms. */
  backgroundAt: number | null;
  failedAttempts: number;
  /** How long before a PIN is accepted again, ms. */
  waitLeftMs: number;
  lock: () => void;
  unlock: () => void;
  wentToBackground: (at: number, autoLock: AutoLock, hasPin: boolean) => void;
  cameBack: (now: number, autoLock: AutoLock, hasPin: boolean) => void;
  /** A wrong PIN: after the fourth, each mistake makes the next try wait longer. */
  fail: () => void;
  /** Time measured by the lock screen while the wait runs. */
  passWait: (elapsedMs: number) => void;
}

interface Lockout {
  failedAttempts: number;
  waitLeftMs: number;
}

function readLockout(store: SecretStore): Lockout {
  try {
    const value = JSON.parse(store.get(SECRET_KEYS.lockout) ?? 'null') as { failedAttempts?: unknown; waitLeftMs?: unknown; lockedOutUntil?: unknown } | null;
    const failedAttempts = typeof value?.failedAttempts === 'number' ? value.failedAttempts : 0;
    const longest = lockoutMs(failedAttempts);
    if (typeof value?.waitLeftMs === 'number') return { failedAttempts, waitLeftMs: Math.min(Math.max(0, value.waitLeftMs), longest) };
    // Saved by the earlier version as an end time on the clock.
    const until = typeof value?.lockedOutUntil === 'number' ? value.lockedOutUntil : 0;
    return { failedAttempts, waitLeftMs: Math.min(Math.max(0, until - Date.now()), longest) };
  } catch {
    return { failedAttempts: 0, waitLeftMs: 0 };
  }
}

/**
 * Whether the app is locked, and the count of wrong PINs. The count and the wait left are kept in
 * `secrets`, so closing the app gives no new tries. The wait is the time left, not an end time on
 * the phone's clock, which anyone holding the phone can move forward.
 */
export function createLockStore({ secrets: store, startsLocked }: { secrets: SecretStore; startsLocked: boolean }) {
  const saveLockout = (lockout: Lockout) => store.set(SECRET_KEYS.lockout, JSON.stringify(lockout));
  return create<LockState>((set, get) => ({
    locked: startsLocked,
    coldStart: startsLocked,
    backgroundAt: null,
    ...readLockout(store),
    lock: () => set({ locked: true }),
    unlock: () => {
      if (get().failedAttempts > 0) saveLockout({ failedAttempts: 0, waitLeftMs: 0 });
      set({ locked: false, coldStart: false, failedAttempts: 0, waitLeftMs: 0, backgroundAt: null });
    },
    // «Immediate» locks on the way out, so coming back never shows a frame of the app.
    wentToBackground: (at, autoLock, hasPin) => set({ backgroundAt: at, ...(hasPin && autoLock === 'immediate' ? { locked: true } : {}) }),
    cameBack: (now, autoLock, hasPin) => {
      if (hasPin && shouldLockOnReturn(get().backgroundAt, now, autoLock)) set({ locked: true });
      set({ backgroundAt: null });
    },
    fail: () => {
      const failedAttempts = get().failedAttempts + 1;
      const lockout = { failedAttempts, waitLeftMs: lockoutMs(failedAttempts) };
      saveLockout(lockout);
      set(lockout);
    },
    passWait: (elapsedMs) => {
      const { failedAttempts, waitLeftMs } = get();
      if (waitLeftMs <= 0 || elapsedMs <= 0) return;
      const lockout = { failedAttempts, waitLeftMs: Math.max(0, waitLeftMs - elapsedMs) };
      saveLockout(lockout);
      set(lockout);
    },
  }));
}

/** With a PIN, the app starts locked. */
export const useLock = createLockStore({ secrets, startsLocked: useSettings.getState().pin !== null });
