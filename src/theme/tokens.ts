import type { TextStyle } from 'react-native';
import { cubicBezier, Easing } from 'react-native-reanimated';

/** 4-point grid. Row gap < group gap < section gap. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  smd: 12,
  md: 16,
  gutter: 20,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  /** Enamel band and signage corners. */
  sign: 7,
  /** Line badges. */
  badge: 6,
  key: 12,
  control: 14,
  card: 20,
  sheet: 28,
  full: 9999,
} as const;

export const shadows = {
  floating: '0 8px 24px rgba(0, 0, 0, 0.10)',
} as const;

/**
 * Durations in ms, curves and springs, so motion across the app feels related.
 * Springs use Apple's two designer parameters (duration, dampingRatio).
 */
export const motion = {
  press: 120,
  fast: 150,
  base: 250,
  slow: 400,
  easeOut: cubicBezier(0.23, 1, 0.32, 1),
  easeInOut: cubicBezier(0.77, 0, 0.175, 1),
  /** The same ease-out as a function, for withTiming in worklets (the values above are for CSS transitions). */
  easeOutTiming: Easing.bezier(0.23, 1, 0.32, 1),
  spring: {
    settle: { duration: 400, dampingRatio: 1 },
    sheet: { duration: 300, dampingRatio: 0.8 },
  },
} as const;

export const fonts = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
  figure: 'ArchivoNarrow_700Bold',
  figureMedium: 'ArchivoNarrow_600SemiBold',
} as const;

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

/**
 * Named text styles. Static fonts carry their weight in `fontFamily`, so no `fontWeight` here.
 * Colours are applied by the Text component from the theme.
 */
export const type = {
  display: { fontFamily: fonts.figure, fontSize: 54, lineHeight: 58, letterSpacing: -1.6, fontVariant: tabular },
  displayCents: { fontFamily: fonts.figureMedium, fontSize: 28, lineHeight: 34, letterSpacing: -0.4, fontVariant: tabular },
  figure: { fontFamily: fonts.figure, fontSize: 22, lineHeight: 26, letterSpacing: -0.4, fontVariant: tabular },
  amountInput: { fontFamily: fonts.figure, fontSize: 64, lineHeight: 70, letterSpacing: -2, fontVariant: tabular },
  title1: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 },
  title2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  title3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, fontVariant: tabular },
  callout: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 20 },
  subhead: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  subheadStrong: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, fontVariant: tabular },
  footnote: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 },
  badge: { fontFamily: fonts.extrabold, fontSize: 13, lineHeight: 16 },
  tab: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 13 },
  key: { fontFamily: fonts.medium, fontSize: 26, lineHeight: 32, fontVariant: tabular },
} as const satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

/**
 * The Home backdrop: a faint piece of the metro map (default) or soft glows, behind the hero.
 * Decoration only: it shows category colours, never amounts.
 */
export const backdrop = {
  /** Map lines: distance between parallel lines, and their stroke. */
  pitch: 9,
  stroke: 7,
  /** The bundle runs this far below the top of the content, beside the hero figure. */
  mapTop: 116,
  /** How strongly the map shows through the page background. */
  mapStrength: { light: 0.2, dark: 0.32 },
  /** Centre opacity of each glow, largest category first. */
  glowStrength: { light: [0.32, 0.26, 0.2], dark: [0.42, 0.32, 0.22] },
  /** The backdrop travels at this share of the scroll, so it sits behind the content. */
  parallax: 0.4,
  /** Scroll distance over which the backdrop fades away. */
  fadeOut: 240,
  /** Lines drawing in at launch, one after the other. */
  draw: 900,
  drawStagger: 90,
  /** The interchange appears once the lines have nearly arrived. */
  interchangeDelay: 650,
  interchangeFade: 300,
  /** The saved category's line lights up once the add sheet has gone. */
  pulseDelay: 300,
  pulseIn: 225,
  pulseOut: 675,
  pulseStrength: 0.7,
  /** One slow drift cycle per glow, deliberately out of step. */
  drift: [19000, 23000, 27000],
} as const;

/** Content never grows wider than a phone; on iPad and web the app sits in a centred column. */
export const layout = {
  maxContentWidth: 480,
  tabBarHeight: 64,
} as const;
