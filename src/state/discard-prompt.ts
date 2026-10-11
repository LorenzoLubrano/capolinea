import { create } from 'zustand';

interface DiscardPromptState {
  /** «Scartare?» waiting for an answer; `leave` closes the sheet. */
  pending: { leave: () => void } | null;
  ask: (leave: () => void) => void;
  /** `keep` is also Back and a tap outside the dialog. */
  answer: (choice: 'keep' | 'discard') => void;
}

/** The Android «Scartare?» dialog, drawn by `DiscardDialog` in the root layout (iOS keeps the system alert). */
export const useDiscardPrompt = create<DiscardPromptState>((set, get) => ({
  pending: null,
  ask: (leave) => set({ pending: { leave } }),
  answer: (choice) => {
    const { pending } = get();
    if (!pending) return;
    set({ pending: null });
    if (choice === 'discard') pending.leave();
  },
}));
