/** A key-value store read synchronously, so settings are there from the first frame. */
export interface SyncStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Small secrets kept by the phone's keystore: never in a backup, never on another phone. */
export interface SecretStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** Every secret of the app, so a new install can forget what an earlier one left behind. */
export const SECRET_KEYS = { pin: 'capolinea.pin', lockout: 'capolinea.lockout' } as const;
