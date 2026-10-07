import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsState {
  /** Privacy mode: every amount in the app is hidden. */
  privacy: boolean;
  themeMode: ThemeMode;
  togglePrivacy: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

/** UI preferences. Financial data never lives here: it comes from the repositories. */
export const useSettings = create<SettingsState>((set) => ({
  privacy: false,
  themeMode: 'system',
  togglePrivacy: () => set((state) => ({ privacy: !state.privacy })),
  setThemeMode: (themeMode) => set({ themeMode }),
}));
