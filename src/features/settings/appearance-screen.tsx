import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { Screen } from '@/components/screen';
import { SettingsGroup, SettingsRow } from '@/components/settings-group';
import { AppText } from '@/components/text';
import { useSnapshot } from '@/data/queries';
import { glowSpots, mapBundle } from '@/features/home/backdrop';
import { buildHomeSummary } from '@/features/home/summary';
import { it } from '@/i18n/it';
import { haptics } from '@/services/haptics';
import { useSettings, type HomeBackdrop, type ThemeMode } from '@/state/settings';
import { backdrop, mix, radius, spacing, useTheme } from '@/theme';

const THEMES: ThemeMode[] = ['system', 'light', 'dark'];
const BACKDROPS: HomeBackdrop[] = ['map', 'glow'];
const FALLBACK_LINES = ['blue', 'green', 'yellow', 'sky'];

/** A thumbnail of the Home top: the chosen backdrop behind two text bars. */
function BackdropPreview({ kind, colorKeys }: { kind: HomeBackdrop; colorKeys: string[] }) {
  const { scheme, colors, lineColor } = useTheme();
  const frame = { screenWidth: 390, columnWidth: 390 };
  const fills = colorKeys.map((key) => lineColor(key).fill);
  const [width, setWidth] = useState(0);

  let art = null;
  if (kind === 'map') {
    const bundle = mapBundle({ ...frame, top: 150, count: fills.length, pitch: backdrop.pitch });
    const strength = backdrop.mapStrength[scheme];
    art = (
      <>
        {bundle.lines.map((line, i) => (
          <Path
            key={i}
            d={'M' + line.points.map(([x, y]) => `${x} ${y}`).join(' L ')}
            stroke={mix(fills[i], colors.background, strength)}
            strokeWidth={backdrop.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        <Rect {...bundle.interchange} rx={bundle.interchange.width / 2} fill={colors.background} stroke={mix(colors.ink, colors.background, strength)} strokeWidth={2.5} />
      </>
    );
  } else {
    const strength = backdrop.glowStrength[scheme];
    const spots = glowSpots({ ...frame, top: 34 });
    art = (
      <>
        <Defs>
          {spots.map((_, i) => (
            <RadialGradient key={i} id={`preview-glow-${i}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={fills[i]} stopOpacity={strength[i]} />
              <Stop offset="1" stopColor={fills[i]} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        {spots.map((spot, i) => (
          <Circle key={i} cx={spot.x} cy={spot.y} r={spot.r} fill={`url(#preview-glow-${i})`} />
        ))}
      </>
    );
  }

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: 112, borderRadius: radius.key, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.hairline }}
    >
      {width ? (
        <Svg width={width} height={112} viewBox="0 0 390 280" preserveAspectRatio="xMidYMin slice">
          {art}
          <Rect x={20} y={100} width={120} height={14} rx={7} fill={colors.track} />
          <Rect x={20} y={130} width={170} height={44} rx={10} fill={colors.ink} />
          <Rect x={20} y={192} width={220} height={12} rx={6} fill={colors.track} />
        </Svg>
      ) : null}
    </View>
  );
}

/** Aspetto: theme and the Home backdrop. */
export function AppearanceScreen() {
  const { colors } = useTheme();
  const { data } = useSnapshot();
  const { themeMode, setThemeMode, homeBackdrop, setHomeBackdrop } = useSettings();
  const lines = data ? buildHomeSummary(data).lines.map((l) => l.color) : [];
  const colorKeys = lines.length ? lines : FALLBACK_LINES;

  return (
    <Screen variant="stack">
      <View style={{ gap: spacing.xl }}>
        <SettingsGroup title={it.appearance.theme}>
          {THEMES.map((mode) => (
            <SettingsRow
              key={mode}
              role="radio"
              title={it.appearance.themes[mode]}
              hint={mode === 'system' ? it.appearance.themeSystemHint : undefined}
              checked={themeMode === mode}
              onPress={() => {
                haptics.selection();
                setThemeMode(mode);
              }}
            />
          ))}
        </SettingsGroup>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="subheadStrong" tone="secondary" accessibilityRole="header" style={{ paddingHorizontal: spacing.xs }}>
            {it.appearance.backdrop}
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.smd }}>
            {BACKDROPS.map((kind) => {
              const selected = homeBackdrop === kind;
              return (
                <PressableScale
                  key={kind}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={it.appearance.backdrops[kind]}
                  accessibilityHint={it.appearance.backdropHints[kind]}
                  onPress={() => {
                    haptics.selection();
                    setHomeBackdrop(kind);
                  }}
                  style={{
                    flex: 1,
                    gap: spacing.sm,
                    padding: spacing.sm,
                    borderRadius: radius.card,
                    borderCurve: 'continuous',
                    backgroundColor: colors.surface,
                    borderWidth: 2,
                    borderColor: selected ? colors.ink : 'transparent',
                  }}
                >
                  <BackdropPreview kind={kind} colorKeys={colorKeys} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xs, minHeight: 28 }}>
                    <AppText variant="bodyStrong">{it.appearance.backdrops[kind]}</AppText>
                    {selected ? <Icon name="Check" size={18} color={colors.ink} weight="bold" /> : null}
                  </View>
                </PressableScale>
              );
            })}
          </View>
          <AppText variant="footnote" tone="secondary" style={{ paddingHorizontal: spacing.xs }}>
            {`${it.appearance.backdropHints[homeBackdrop]} ${it.appearance.reducedMotion}`}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}
