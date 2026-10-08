/**
 * Linea palette: Milan Metro signage. Enamel white and station black, one ink,
 * categories as saturated line colours. Red is reserved for alerts and destructive actions.
 *
 * Brand light/dark pairs (the same identity on iOS and Android), resolved at render time by `useTheme`.
 */

export const palettes = {
  light: {
    background: '#FAFAF8',
    surface: '#FFFFFF',
    surfaceMuted: '#F0EFEB',
    /** The chosen segment of a segmented control, above `surfaceMuted`. */
    selection: '#FFFFFF',
    ink: '#111111',
    inkSecondary: '#5F5F5B',
    /** Quiet text: axes, legends, notes. Still 4.5:1 on every surface, small sizes included. */
    inkTertiary: '#6B6B66',
    onInk: '#FFFFFF',
    hairline: 'rgba(17, 17, 17, 0.10)',
    track: '#E8E7E2',
    alert: '#C8141B',
    warning: '#8F5A00',
    glass: 'rgba(250, 250, 248, 0.78)',
    glassBorder: 'rgba(17, 17, 17, 0.08)',
    scrim: 'rgba(17, 17, 17, 0.24)',
  },
  dark: {
    background: '#0D0D0E',
    surface: '#17171A',
    surfaceMuted: '#202024',
    selection: '#3A3A40',
    ink: '#F4F4F1',
    inkSecondary: '#A3A39E',
    inkTertiary: '#8A8A83',
    onInk: '#0D0D0E',
    hairline: 'rgba(255, 255, 255, 0.10)',
    track: '#26262A',
    alert: '#FF5A52',
    warning: '#F2B54A',
    glass: 'rgba(23, 23, 26, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.10)',
    scrim: 'rgba(0, 0, 0, 0.50)',
  },
} as const;

export type ColorScheme = keyof typeof palettes;
export type Palette = { [K in keyof (typeof palettes)['light']]: string };

/**
 * Category line colours, identical in both themes like enamel signs.
 * `on` is the text colour for initials on the badge (contrast checked against `fill`).
 */
export const lines = {
  green: { fill: '#0B9C55', on: '#FFFFFF' },
  yellow: { fill: '#F2B315', on: '#111111' },
  blue: { fill: '#1C5DAE', on: '#FFFFFF' },
  lilac: { fill: '#8E5BB5', on: '#FFFFFF' },
  sky: { fill: '#2A93C9', on: '#111111' },
  magenta: { fill: '#C2337A', on: '#FFFFFF' },
  orange: { fill: '#E07010', on: '#111111' },
  teal: { fill: '#0E8A8A', on: '#FFFFFF' },
  indigo: { fill: '#3F4AB0', on: '#FFFFFF' },
  olive: { fill: '#6E8B1F', on: '#FFFFFF' },
  brown: { fill: '#8A5A2B', on: '#FFFFFF' },
  slate: { fill: '#4A6378', on: '#FFFFFF' },
  pink: { fill: '#D9679A', on: '#111111' },
  plum: { fill: '#7A2E5E', on: '#FFFFFF' },
  grey: { fill: '#8C8C88', on: '#111111' },
} as const;

export type LineKey = keyof typeof lines;

export function lineColor(key: string): { fill: string; on: string } {
  return key in lines ? lines[key as LineKey] : lines.grey;
}

/**
 * `foreground` laid over `background` at `amount` opacity, as one opaque #rrggbb colour.
 * Faint drawings use it instead of transparency, so shapes that touch never darken each other.
 */
export function mix(foreground: string, background: string, amount: number): string {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  let out = '#';
  for (let i = 0; i < 3; i++) {
    const value = Math.round(channel(foreground, i) * amount + channel(background, i) * (1 - amount));
    out += value.toString(16).padStart(2, '0');
  }
  return out;
}
