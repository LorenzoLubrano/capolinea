import { Platform } from 'react-native';
import { create } from 'zustand';

import type { DatasetKind, FakeDate } from '@/data/mock/variants';
import type { Faults } from '@/data/prototype-faults';
import type { LocalDate } from '@/domain/types';

/** How long every call waits with «Caricamento lento». */
export const SLOW_MS = 2000;

interface PrototypeState {
  /** What the panel loaded last; `empty` after a first launch, when the data is the user's own. */
  dataset: DatasetKind;
  date: FakeDate;
  /** The «today» the loaded data was made for; none: the phone's clock. */
  today?: LocalDate;
  slow: boolean;
  readError: boolean;
  setLoaded: (dataset: DatasetKind, date: FakeDate, today?: LocalDate) => void;
  setSlow: (slow: boolean) => void;
  setReadError: (readError: boolean) => void;
}

// The web preview starts on the example data in memory; the phone on its own database.
const ON_WEB = Platform.OS === 'web';

/** Pannello prototipo, development only. Lives for the session. */
export const usePrototype = create<PrototypeState>((set) => ({
  dataset: ON_WEB ? 'full' : 'empty',
  date: ON_WEB ? 'pinned' : 'real',
  slow: false,
  readError: false,
  setLoaded: (dataset, date, today) => set({ dataset, date, today }),
  setSlow: (slow) => set({ slow }),
  setReadError: (readError) => set({ readError }),
}));

/** What the repositories simulate right now. */
export function prototypeFaults(): Faults {
  const { slow, readError } = usePrototype.getState();
  return { delayMs: slow ? SLOW_MS : 0, failReads: readError };
}
