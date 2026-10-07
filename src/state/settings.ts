import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

/** Home backdrop: a piece of the metro map (default) or soft glows. */
export type HomeBackdrop = 'map' | 'glow';

interface SettingsState {
  /** Privacy mode: every amount in the app is hidden. */
  privacy: boolean;
  themeMode: ThemeMode;
  homeBackdrop: HomeBackdrop;
  togglePrivacy: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setHomeBackdrop: (backdrop: HomeBackdrop) => void;
}

/** UI preferences. Financial data never lives here: it comes from the repositories. */
export const useSettings = create<SettingsState>((set) => ({
  privacy: false,
  themeMode: 'system',
  homeBackdrop: 'map',
  togglePrivacy: () => set((state) => ({ privacy: !state.privacy })),
  setThemeMode: (themeMode) => set({ themeMode }),
  setHomeBackdrop: (homeBackdrop) => set({ homeBackdrop }),
}));
