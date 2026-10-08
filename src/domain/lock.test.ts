import { lockoutMs, shouldLockOnReturn } from './lock';

describe('shouldLockOnReturn', () => {
  const left = 1_000_000;

  it('locks when the app stayed away at least as long as the chosen delay', () => {
    expect(shouldLockOnReturn(left, left + 59_000, '1m')).toBe(false);
    expect(shouldLockOnReturn(left, left + 60_000, '1m')).toBe(true);
    expect(shouldLockOnReturn(left, left + 4 * 60_000, '5m')).toBe(false);
    expect(shouldLockOnReturn(left, left + 15 * 60_000, '15m')).toBe(true);
  });

  it('locks at once with "immediate", and never without a time to compare', () => {
    expect(shouldLockOnReturn(left, left + 1, 'immediate')).toBe(true);
    expect(shouldLockOnReturn(null, left, 'immediate')).toBe(false);
  });
});

describe('lockoutMs', () => {
  it('lets the first four mistakes go, then waits longer and longer', () => {
    expect(lockoutMs(4)).toBe(0);
    expect(lockoutMs(5)).toBe(30_000);
    expect(lockoutMs(6)).toBe(60_000);
    expect(lockoutMs(8)).toBe(5 * 60_000);
    expect(lockoutMs(12)).toBe(15 * 60_000);
  });
});
