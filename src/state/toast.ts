import { create } from 'zustand';

export interface ToastMessage {
  id: number;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  current: ToastMessage | null;
  show: (message: Omit<ToastMessage, 'id'>) => void;
  hide: (id: number) => void;
}

let seq = 0;

/** One toast at a time: a newer one replaces the older. Undo lives here instead of confirmation dialogs. */
export const useToast = create<ToastState>((set) => ({
  current: null,
  show: (message) => set({ current: { ...message, id: ++seq } }),
  hide: (id) => set((state) => (state.current?.id === id ? { current: null } : state)),
}));
