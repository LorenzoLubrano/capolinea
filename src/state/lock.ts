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
  /** No PIN is accepted before this time, epoch ms. */
  lockedOutUntil: number | null;
  lock: () => void;
  unlock: () => void;
  wentToBackground: (at: number) => void;
  cameBack: (now: number, autoLock: AutoLock, hasPin: boolean) => void;
  /** A wrong PIN: after the fourth, each mistake makes the next try wait longer. */
  fail: (now: number) => void;
}

interface Lockout {
  failedAttempts: number;
  lockedOutUntil: number | null;
}

function readLockout(store: SecretStore): Lockout {
  try {
    const value = JSON.parse(store.get(SECRET_KEYS.lockout) ?? 'null') as Partial<Lockout> | null;
    return {
      failedAttempts: typeof value?.failedAttempts === 'number' ? value.failedAttempts : 0,
      lockedOutUntil: typeof value?.lockedOutUntil === 'number' ? value.lockedOutUntil : null,
    };
  } catch {
    return { failedAttempts: 0, lockedOutUntil: null };
  }
}

/**
 * Whether the app is locked, and the count of wrong PINs. The count and the wait are kept in
 * `secrets`, so closing the app gives no new tries.
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
      if (get().failedAttempts > 0) saveLockout({ failedAttempts: 0, lockedOutUntil: null });
      set({ locked: false, coldStart: false, failedAttempts: 0, lockedOutUntil: null, backgroundAt: null });
    },
    wentToBackground: (at) => set({ backgroundAt: at }),
    cameBack: (now, autoLock, hasPin) => {
      if (hasPin && shouldLockOnReturn(get().backgroundAt, now, autoLock)) set({ locked: true });
      set({ backgroundAt: null });
    },
    fail: (now) => {
      const failedAttempts = get().failedAttempts + 1;
      const wait = lockoutMs(failedAttempts);
      const lockout = { failedAttempts, lockedOutUntil: wait ? now + wait : null };
      saveLockout(lockout);
      set(lockout);
    },
  }));
}

/** With a PIN, the app starts locked. */
export const useLock = createLockStore({ secrets, startsLocked: useSettings.getState().pin !== null });
