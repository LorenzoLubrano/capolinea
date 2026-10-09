import type { SecretStore, SyncStorage } from './device-storage.shared';

export * from './device-storage.shared';

/** The web preview (development only) keeps settings and secrets for the session, like its data. */
export const settingsStorage: SyncStorage | null = null;

const kept = new Map<string, string>();

export const secrets: SecretStore = {
  get: (key) => kept.get(key) ?? null,
  set: (key, value) => {
    kept.set(key, value);
  },
};
