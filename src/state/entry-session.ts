import { create } from 'zustand';

import type { Id, LocalDate } from '@/domain/types';

/** How long the last date and account stay proposed after a save: one evening of entries. */
export const ENTRY_MEMORY_MS = 30 * 60 * 1000;

export interface LastEntry {
  date: LocalDate;
  accountId: Id;
  /** When it was saved, epoch ms. */
  at: number;
}

/** The date and account to propose for a new movement: the last ones, if saved recently. */
export function rememberedEntry(last: LastEntry | null, now: number): { date: LocalDate; accountId: Id } | null {
  return last && now - last.at < ENTRY_MEMORY_MS ? { date: last.date, accountId: last.accountId } : null;
}

/** The last date and account saved, for the next new movement. Lives for the session. */
export const useLastEntry = create<{ last: LastEntry | null; remember: (last: LastEntry) => void }>((set) => ({
  last: null,
  remember: (last) => set({ last }),
}));
