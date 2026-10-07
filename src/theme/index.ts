import { useColorScheme } from 'react-native';

import { useSettings } from '@/state/settings';

import { lineColor, lines, palettes, type ColorScheme, type Palette } from './colors';

export * from './colors';
export * from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  lines: typeof lines;
  lineColor: typeof lineColor;
}

/** The single entry point for colours: system appearance unless the user picked one in Aspetto. */
export function useTheme(): Theme {
  const system = useColorScheme();
  const mode = useSettings((state) => state.themeMode);
  const scheme: ColorScheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  return { scheme, colors: palettes[scheme], lines, lineColor };
}
