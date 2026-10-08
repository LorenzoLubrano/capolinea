import { create } from 'zustand';

/** The six designed states of the optional cloud sync. Phase 1 has no server: they are simulated. */
export type SyncStatus = 'off' | 'on' | 'syncing' | 'offline' | 'error' | 'conflict';
export type SyncProvider = 'apple' | 'google' | 'email';

interface SyncState {
  status: SyncStatus;
  provider: SyncProvider | null;
  /** When the last sync ended, epoch ms. */
  lastSyncAt: number | null;
  signIn: (provider: SyncProvider) => void;
  syncNow: () => void;
  signOut: () => void;
  resolveConflict: () => void;
  /** Prototype panel: force a state to see how it looks. */
  setStatus: (status: SyncStatus) => void;
}

const SIMULATED_SYNC_MS = 1400;

/** Concept of phase 3: a sign-in and a sync that only pretend, so every state can be seen and judged. */
export const useSync = create<SyncState>((set, get) => {
  const run = () => {
    set({ status: 'syncing' });
    setTimeout(() => {
      if (get().status === 'syncing') set({ status: 'on', lastSyncAt: Date.now() });
    }, SIMULATED_SYNC_MS);
  };
  return {
    status: 'off',
    provider: null,
    lastSyncAt: null,
    signIn: (provider) => {
      set({ provider });
      run();
    },
    syncNow: run,
    signOut: () => set({ status: 'off', provider: null, lastSyncAt: null }),
    resolveConflict: () => set({ status: 'on', lastSyncAt: Date.now() }),
    setStatus: (status) => set((state) => ({ status, provider: status === 'off' ? null : (state.provider ?? 'apple'), lastSyncAt: status === 'off' ? null : (state.lastSyncAt ?? Date.now() - 2 * 60000) })),
  };
});
