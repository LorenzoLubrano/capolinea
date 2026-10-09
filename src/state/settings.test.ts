import { createSettingsStore, DEFAULT_NOTIFICATIONS, type PinRecord } from './settings';
import { memorySecrets, memoryStorage } from './testing/memory-stores';

const PIN: PinRecord = { hash: 'a1b2c3d4', salt: 'e5f6a7b8', length: 5 };

/** One phone: the same stores across launches of the app. */
function phone() {
  const storage = memoryStorage();
  const secrets = memorySecrets();
  return { storage, secrets, launch: () => createSettingsStore({ storage, secrets, onboardedByDefault: false }) };
}

describe('settings', () => {
  it('starts on the onboarding on a new install', () => {
    expect(phone().launch().getState().onboarded).toBe(false);
  });

  it('keeps the settings after the app is closed and opened again', () => {
    const { launch } = phone();
    const first = launch().getState();
    first.setThemeMode('dark');
    first.setPrivacy(true);
    first.setOnboarded(true);
    first.setNotifications({ eveningReminder: true });

    expect(launch().getState()).toMatchObject({
      themeMode: 'dark',
      privacy: true,
      onboarded: true,
      notifications: { ...DEFAULT_NOTIFICATIONS, eveningReminder: true },
    });
  });

  it('keeps the PIN only in the secure store, and finds it at the next launch', () => {
    const { storage, launch } = phone();
    launch().getState().setPin(PIN);

    expect(JSON.stringify(storage.entries())).not.toMatch(new RegExp(`${PIN.hash}|${PIN.salt}`));
    expect(launch().getState().pin).toEqual(PIN);
  });

  it('forgets the PIN and the biometrics when the lock is turned off, also at the next launch', () => {
    const { launch } = phone();
    const first = launch().getState();
    first.setPin(PIN);
    first.setBiometrics(true);
    first.setPin(null);

    expect(launch().getState()).toMatchObject({ pin: null, biometrics: false });
  });

  it('forgets the lock when the data is wiped, also at the next launch', () => {
    const { launch } = phone();
    const first = launch().getState();
    first.setPin(PIN);
    first.setAutoLock('immediate');
    first.resetSecurity();

    expect(launch().getState()).toMatchObject({ pin: null, biometrics: false, autoLock: '1m' });
  });

  it('ignores a PIN left by an earlier install', () => {
    const before = phone();
    before.launch().getState().setPin(PIN);

    // Reinstalled: the settings are gone, the iOS keychain may still hold the PIN.
    const reinstalled = createSettingsStore({ storage: memoryStorage(), secrets: before.secrets, onboardedByDefault: false });

    expect(reinstalled.getState().pin).toBeNull();
  });

  it('gives a notification rule added in a later version its default', () => {
    const { storage, launch } = phone();
    launch().getState().setNotifications({ budgetNear: false });
    const [key, saved] = Object.entries(storage.entries())[0];
    const older = JSON.parse(saved);
    delete older.state.notifications.goals;
    storage.setItem(key, JSON.stringify(older));

    expect(launch().getState().notifications).toEqual({ ...DEFAULT_NOTIFICATIONS, budgetNear: false });
  });

  it('works without storage, as in the web preview', () => {
    const store = createSettingsStore({ storage: null, secrets: memorySecrets(), onboardedByDefault: true });
    store.getState().setPin(PIN);

    expect(store.getState()).toMatchObject({ onboarded: true, pin: PIN });
  });
});
