import { SECRET_KEYS } from '@/services/device-storage';

import { createLockStore } from './lock';
import { memorySecrets } from './testing/memory-stores';

const failTimes = (lock: ReturnType<typeof createLockStore>, times: number) => {
  for (let i = 0; i < times; i += 1) lock.getState().fail();
};

describe('lock', () => {
  it('starts locked, as a cold start, when a PIN is set', () => {
    const lock = createLockStore({ secrets: memorySecrets(), startsLocked: true });

    expect(lock.getState()).toMatchObject({ locked: true, coldStart: true });
  });

  it('starts open without a PIN', () => {
    const lock = createLockStore({ secrets: memorySecrets(), startsLocked: false });

    expect(lock.getState()).toMatchObject({ locked: false, coldStart: false });
  });

  it('makes the fifth wrong PIN wait 30 seconds', () => {
    const lock = createLockStore({ secrets: memorySecrets(), startsLocked: true });
    failTimes(lock, 4);
    expect(lock.getState().waitLeftMs).toBe(0);

    lock.getState().fail();

    expect(lock.getState()).toMatchObject({ failedAttempts: 5, waitLeftMs: 30_000 });
  });

  it('lets the wait pass only by the time measured, whatever the clock of the phone says', () => {
    const lock = createLockStore({ secrets: memorySecrets(), startsLocked: true });
    failTimes(lock, 5);

    lock.getState().passWait(10_000);
    expect(lock.getState().waitLeftMs).toBe(20_000);

    lock.getState().passWait(25_000);
    expect(lock.getState().waitLeftMs).toBe(0);
  });

  it('remembers the wrong PINs and the wait left when the app is closed', () => {
    const secrets = memorySecrets();
    const first = createLockStore({ secrets, startsLocked: true });
    failTimes(first, 5);
    first.getState().passWait(12_000);

    const second = createLockStore({ secrets, startsLocked: true });

    expect(second.getState()).toMatchObject({ locked: true, failedAttempts: 5, waitLeftMs: 18_000 });
  });

  it('reads a wait saved by the earlier version as at most the wait of that attempt', () => {
    const secrets = memorySecrets();
    secrets.set(SECRET_KEYS.lockout, JSON.stringify({ failedAttempts: 5, lockedOutUntil: Date.now() + 10 * 60 * 60_000 }));

    const lock = createLockStore({ secrets, startsLocked: true });

    expect(lock.getState()).toMatchObject({ failedAttempts: 5, waitLeftMs: 30_000 });
  });

  it('with «immediate», locks as the app leaves: nothing shows when it comes back', () => {
    const lock = createLockStore({ secrets: memorySecrets(), startsLocked: false });

    lock.getState().wentToBackground(1_000, 'immediate', true);

    expect(lock.getState().locked).toBe(true);
  });

  it('with a delay, waits for the return to decide', () => {
    const lock = createLockStore({ secrets: memorySecrets(), startsLocked: false });

    lock.getState().wentToBackground(1_000, '1m', true);
    expect(lock.getState().locked).toBe(false);

    lock.getState().cameBack(61_000, '1m', true);
    expect(lock.getState().locked).toBe(true);
  });

  it('forgets the wrong PINs once unlocked, also at the next launch', () => {
    const secrets = memorySecrets();
    const first = createLockStore({ secrets, startsLocked: true });
    failTimes(first, 5);
    first.getState().unlock();

    expect(first.getState()).toMatchObject({ locked: false, coldStart: false, failedAttempts: 0, waitLeftMs: 0 });
    expect(createLockStore({ secrets, startsLocked: true }).getState()).toMatchObject({ failedAttempts: 0, waitLeftMs: 0 });
  });
});
