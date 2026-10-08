import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type CSSAnimationKeyframes,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import type { Id, Transaction } from '@/domain/types';
import { useReduceMotion } from '@/services/a11y';
import { useSettings } from '@/state/settings';
import { backdrop, layout, mix, motion, useTheme } from '@/theme';

import { glowSpots, mapBundle, type Point } from './backdrop';
import type { HomeSummary } from './summary';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/** The map draws itself once per app launch, not every time the Home comes back. */
let drawnThisLaunch = false;

type Lines = HomeSummary['lines'];

const toPath = (points: readonly Point[]) => 'M' + points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L ');

function useFrame() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return { screenWidth: width, columnWidth: Math.min(width, layout.maxContentWidth), top: insets.top };
}

function MapLine({
  points,
  length,
  color,
  pulseColor,
  index,
  animate,
  categoryId,
  latest,
}: {
  points: Point[];
  length: number;
  color: string;
  pulseColor: string;
  index: number;
  animate: boolean;
  categoryId: Id;
  latest: Transaction | null;
}) {
  const offset = useSharedValue(animate ? length : 0);
  const pulse = useSharedValue(0);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    if (!animate) return;
    offset.set(withDelay(index * backdrop.drawStagger, withTiming(0, { duration: backdrop.draw, easing: motion.easeOutTiming })));
  }, [animate, index, offset]);

  // A transaction created after the ones already seen lights up its category's line, once.
  useEffect(() => {
    if (!latest) return;
    const previous = seen.current;
    if (previous === null || latest.createdAt > previous) seen.current = latest.createdAt;
    if (previous === null || latest.createdAt <= previous || latest.categoryId !== categoryId) return;
    // Opacity only, so it plays under Reduce Motion too: Reanimated would otherwise skip to the end.
    pulse.set(
      withDelay(
        backdrop.pulseDelay,
        withSequence(
          ReduceMotion.Never,
          withTiming(backdrop.pulseStrength, { duration: backdrop.pulseIn, easing: motion.easeOutTiming, reduceMotion: ReduceMotion.Never }),
          withTiming(0, { duration: backdrop.pulseOut, easing: motion.easeOutTiming, reduceMotion: ReduceMotion.Never }),
        ),
        ReduceMotion.Never,
      ),
    );
  }, [latest, categoryId, pulse]);

  const drawProps = useAnimatedProps(() => ({ strokeDashoffset: offset.get() }));
  const pulseProps = useAnimatedProps(() => ({ strokeOpacity: pulse.get() }));
  const d = toPath(points);
  const stroke = { fill: 'none', strokeWidth: backdrop.stroke, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

  return (
    <>
      <AnimatedPath d={d} stroke={color} strokeDasharray={[length, length]} animatedProps={drawProps} {...stroke} />
      <AnimatedPath d={d} stroke={pulseColor} strokeOpacity={0} animatedProps={pulseProps} {...stroke} />
    </>
  );
}

/** A piece of the metro map: the month's top categories as parallel lines beside the hero figure. */
function MapBackdrop({ lines, latest }: { lines: Lines; latest: Transaction | null }) {
  const frame = useFrame();
  const { scheme, colors, lineColor } = useTheme();
  const reduced = useReduceMotion();
  const [animate] = useState(() => !reduced && !drawnThisLaunch);
  const interchange = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    drawnThisLaunch = true;
    if (!animate) return;
    interchange.set(withDelay(backdrop.interchangeDelay, withTiming(1, { duration: backdrop.interchangeFade, easing: motion.easeOutTiming })));
  }, [animate, interchange]);

  const interchangeProps = useAnimatedProps(() => ({ opacity: interchange.get() }));
  const strength = backdrop.mapStrength[scheme];
  const top = frame.top + backdrop.mapTop;
  const bundle = mapBundle({ ...frame, top, count: lines.length, pitch: backdrop.pitch });
  const box = bundle.interchange;

  return (
    <Svg width={frame.screenWidth} height={top + lines.length * backdrop.pitch + 40} style={{ position: 'absolute', top: 0, left: 0 }}>
      {bundle.lines.map((line, i) => {
        const fill = lineColor(lines[i].color).fill;
        return (
          <MapLine
            key={lines[i].categoryId}
            points={line.points}
            length={line.length}
            color={mix(fill, colors.background, strength)}
            pulseColor={fill}
            index={i}
            animate={animate}
            categoryId={lines[i].categoryId}
            latest={latest}
          />
        );
      })}
      <AnimatedRect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={box.width / 2}
        fill={colors.background}
        stroke={mix(colors.ink, colors.background, strength)}
        strokeWidth={2.5}
        animatedProps={interchangeProps}
      />
    </Svg>
  );
}

const still = { transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
const DRIFT: CSSAnimationKeyframes[] = [
  { from: still, to: { transform: [{ translateX: -34 }, { translateY: 22 }, { scale: 1.08 }] } },
  { from: still, to: { transform: [{ translateX: 40 }, { translateY: 14 }, { scale: 0.94 }] } },
  { from: still, to: { transform: [{ translateX: -22 }, { translateY: -26 }, { scale: 1.1 }] } },
];

/** Light: soft glows in the colours of the top lines, drifting slowly while the Home is in view. */
function GlowBackdrop({ lines }: { lines: Lines }) {
  const frame = useFrame();
  const { scheme, lineColor } = useTheme();
  const focused = useIsFocused();
  const reduced = useReduceMotion();
  const strength = backdrop.glowStrength[scheme];

  return glowSpots(frame).map((spot, i) => {
    const line = lines[i];
    if (!line) return null;
    const color = lineColor(line.color).fill;
    const size = spot.r * 2;
    const id = `home-glow-${i}`;
    return (
      <Animated.View
        key={id}
        style={[
          { position: 'absolute', left: spot.x - spot.r, top: spot.y - spot.r, width: size, height: size },
          reduced
            ? null
            : {
                animationName: DRIFT[i],
                animationDuration: backdrop.drift[i],
                animationIterationCount: 'infinite',
                animationDirection: 'alternate',
                animationTimingFunction: 'ease-in-out',
                animationPlayState: focused ? 'running' : 'paused',
              },
        ]}
      >
        <Svg width={size} height={size}>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={color} stopOpacity={strength[i]} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={spot.r} cy={spot.r} r={spot.r} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    );
  });
}

/** What sits behind the Home hero, as chosen in the settings. Nothing until there is spending. */
export function HomeBackdrop({ lines, latest }: { lines: Lines; latest: Transaction | null }) {
  const kind = useSettings((state) => state.homeBackdrop);
  if (lines.length === 0) return null;
  return kind === 'glow' ? <GlowBackdrop lines={lines} /> : <MapBackdrop lines={lines} latest={latest} />;
}
