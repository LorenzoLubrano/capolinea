import * as SecureStore from 'expo-secure-store';
import Storage from 'expo-sqlite/kv-store';

import { DATABASE_KEY, type SecretStore, type SyncStorage } from './device-storage.shared';

export * from './device-storage.shared';

/** Settings: a small SQLite key-value file of the app. The web preview has none (`device-storage.web.ts`). */
export const settingsStorage: SyncStorage | null = {
  getItem: (key) => Storage.getItemSync(key),
  setItem: (key, value) => Storage.setItemSync(key, value),
  removeItem: (key) => {
    Storage.removeItemSync(key);
  },
};

const ONLY_THIS_PHONE = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

export const secrets: SecretStore = {
  get: (key) => {
    try {
      return SecureStore.getItem(key, ONLY_THIS_PHONE);
    } catch {
      // A secret the keystore can no longer decrypt is as good as none.
      return null;
    }
  },
  set: (key, value) => SecureStore.setItem(key, value, ONLY_THIS_PHONE),
};

/** The database key, read without the fallback above: a key read as «none» would be replaced. */
export const databaseKeyStore = {
  get: () => SecureStore.getItem(DATABASE_KEY, ONLY_THIS_PHONE),
  set: (key: string) => SecureStore.setItem(DATABASE_KEY, key, ONLY_THIS_PHONE),
};
