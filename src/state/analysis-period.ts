import { create } from 'zustand';

import type { PeriodUnit } from '@/domain/analysis';

interface AnalysisPeriodState {
  unit: PeriodUnit;
  /** Periods back from the current one: 0 is this week, month or year. */
  offset: number;
  setUnit: (unit: PeriodUnit) => void;
  step: (delta: number) => void;
}

/** The period Analisi looks at, shared with its detail sheets. Lives for the session. */
export const useAnalysisPeriod = create<AnalysisPeriodState>((set) => ({
  unit: 'month',
  offset: 0,
  setUnit: (unit) => set({ unit, offset: 0 }),
  step: (delta) => set((state) => ({ offset: Math.min(0, state.offset + delta) })),
}));
