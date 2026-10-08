/** How long the app may stay in the background before it asks to be unlocked again. */
export type AutoLock = 'immediate' | '1m' | '5m' | '15m';

const DELAY_MS: Record<AutoLock, number> = { immediate: 0, '1m': 60_000, '5m': 5 * 60_000, '15m': 15 * 60_000 };

/** Coming back from the background, the app locks if it stayed away at least the chosen delay. */
export function shouldLockOnReturn(backgroundAt: number | null, now: number, autoLock: AutoLock): boolean {
  if (backgroundAt === null) return false;
  return now - backgroundAt >= DELAY_MS[autoLock];
}

const MINUTE = 60_000;
/** Wait after the Nth wrong PIN: nothing for the first four, then longer and longer. */
const LOCKOUT = [0, 0, 0, 0, 0, 30_000, MINUTE, 2 * MINUTE, 5 * MINUTE, 10 * MINUTE];

/** A 4-digit PIN has 10,000 combinations: waiting after each mistake makes guessing them impractical. */
export function lockoutMs(failedAttempts: number): number {
  return failedAttempts < LOCKOUT.length ? LOCKOUT[failedAttempts] : 15 * MINUTE;
}
