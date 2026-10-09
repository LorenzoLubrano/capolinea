import { createLockStore } from './lock';
import { memorySecrets } from './testing/memory-stores';

describe('lock', () => {
  it('starts locked, as a cold start, when a PIN is set', () => {
    const lock = createLockStore({ secrets: memorySecrets(), startsLocked: true });

    expect(lock.getState()).toMatchObject({ locked: true, coldStart: true });
  });

  it('starts open without a PIN', () => {
    const lock = createLockStore({ secrets: memorySecrets(), startsLocked: false });

    expect(lock.getState()).toMatchObject({ locked: false, coldStart: false });
  });

  it('remembers the wrong PINs and the wait when the app is closed', () => {
    const secrets = memorySecrets();
    const first = createLockStore({ secrets, startsLocked: true });
    for (let i = 0; i < 5; i += 1) first.getState().fail(1_000);
    const { failedAttempts, lockedOutUntil } = first.getState();

    const second = createLockStore({ secrets, startsLocked: true });

    expect(failedAttempts).toBe(5);
    expect(lockedOutUntil).toBeGreaterThan(1_000);
    expect(second.getState()).toMatchObject({ locked: true, failedAttempts, lockedOutUntil });
  });

  it('forgets the wrong PINs once unlocked, also at the next launch', () => {
    const secrets = memorySecrets();
    const first = createLockStore({ secrets, startsLocked: true });
    first.getState().fail(1_000);
    first.getState().unlock();

    expect(first.getState()).toMatchObject({ locked: false, coldStart: false, failedAttempts: 0 });
    expect(createLockStore({ secrets, startsLocked: true }).getState()).toMatchObject({ failedAttempts: 0, lockedOutUntil: null });
  });
});
