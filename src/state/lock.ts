import { create } from 'zustand';

import { lockoutMs, shouldLockOnReturn, type AutoLock } from '@/domain/lock';

interface LockState {
  locked: boolean;
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

/** Whether the app is locked, and the count of wrong PINs. Lives in memory, like the PIN in phase 1. */
export const useLock = create<LockState>((set, get) => ({
  locked: false,
  backgroundAt: null,
  failedAttempts: 0,
  lockedOutUntil: null,
  lock: () => set({ locked: true }),
  unlock: () => set({ locked: false, failedAttempts: 0, lockedOutUntil: null, backgroundAt: null }),
  wentToBackground: (at) => set({ backgroundAt: at }),
  cameBack: (now, autoLock, hasPin) => {
    if (hasPin && shouldLockOnReturn(get().backgroundAt, now, autoLock)) set({ locked: true });
    set({ backgroundAt: null });
  },
  fail: (now) => {
    const failedAttempts = get().failedAttempts + 1;
    const wait = lockoutMs(failedAttempts);
    set({ failedAttempts, lockedOutUntil: wait ? now + wait : null });
  },
}));
