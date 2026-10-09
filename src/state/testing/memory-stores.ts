import type { SecretStore, SyncStorage } from '@/services/device-storage';

/** Test-only: the phone's key-value store, in memory. `entries` shows what was written. */
export function memoryStorage(): SyncStorage & { entries: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    entries: () => Object.fromEntries(map),
  };
}

/** Test-only: the secure store. It outlives `memoryStorage`, as the iOS keychain outlives an install. */
export function memorySecrets(): SecretStore {
  const map = new Map<string, string>();
  return {
    get: (key) => map.get(key) ?? null,
    set: (key, value) => {
      map.set(key, value);
    },
  };
}
