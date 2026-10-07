import { create } from 'zustand';

export interface ToastMessage {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
  /** The host on top when the toast was shown. If that screen closes, the screen under it takes over. */
  hostId?: number;
}

interface ToastState {
  current: ToastMessage | null;
  /**
   * Mounted toast hosts, oldest first. Native sheets cover the root view, so each sheet has its
   * own host and only the newest one (the screen on top) shows the toast.
   */
  hosts: number[];
  show: (message: Omit<ToastMessage, 'id' | 'hostId'>) => void;
  hide: (id: number) => void;
  registerHost: (id: number) => void;
  unregisterHost: (id: number) => void;
}

let seq = 0;

/** One toast at a time: a newer one replaces the older. Undo lives here instead of confirmation dialogs. */
export const useToast = create<ToastState>((set) => ({
  current: null,
  hosts: [],
  show: (message) => set((state) => ({ current: { ...message, id: ++seq, hostId: state.hosts[state.hosts.length - 1] } })),
  hide: (id) => set((state) => (state.current?.id === id ? { current: null } : state)),
  registerHost: (id) => set((state) => ({ hosts: [...state.hosts, id] })),
  unregisterHost: (id) =>
    set((state) => {
      const hosts = state.hosts.filter((h) => h !== id);
      const current = state.current?.hostId === id ? { ...state.current, hostId: hosts[hosts.length - 1] } : state.current;
      return { hosts, current };
    }),
}));
