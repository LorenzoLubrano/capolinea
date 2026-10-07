import { create } from 'zustand';

import type { SplitDraft } from '@/domain/splits';

interface SplitDraftState {
  /** The split being prepared for the expense form; shares are computed from it at save time. */
  draft: SplitDraft | null;
  setDraft: (draft: SplitDraft | null) => void;
}

/** Hands the split from its sheet back to the expense form underneath. */
export const useSplitDraft = create<SplitDraftState>((set) => ({
  draft: null,
  setDraft: (draft) => set({ draft }),
}));
