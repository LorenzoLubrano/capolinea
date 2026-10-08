import { create } from 'zustand';

import type { DatasetKind, FakeDate } from '@/data/mock/variants';
import type { Faults } from '@/data/prototype-faults';

/** How long every call waits with «Caricamento lento». */
export const SLOW_MS = 2000;

interface PrototypeState {
  /** What the panel loaded last; `empty` after a first launch, when the data is the user's own. */
  dataset: DatasetKind;
  date: FakeDate;
  slow: boolean;
  readError: boolean;
  setLoaded: (dataset: DatasetKind, date: FakeDate) => void;
  setSlow: (slow: boolean) => void;
  setReadError: (readError: boolean) => void;
}

/** Pannello prototipo, development only. Lives for the session, like the example data. */
export const usePrototype = create<PrototypeState>((set) => ({
  dataset: 'full',
  date: 'pinned',
  slow: false,
  readError: false,
  setLoaded: (dataset, date) => set({ dataset, date }),
  setSlow: (slow) => set({ slow }),
  setReadError: (readError) => set({ readError }),
}));

/** What the repositories simulate right now. */
export function prototypeFaults(): Faults {
  const { slow, readError } = usePrototype.getState();
  return { delayMs: slow ? SLOW_MS : 0, failReads: readError };
}
