import { useState, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { speakable } from '@/services/format/money';
import { motion } from '@/theme';

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Buttons scale; full-width rows and keys pass `feedback="dim"` instead. */
  feedback?: 'scale' | 'dim';
}

/** Placement keys go on the touch target, so `flex: 1` or margins size the pressable itself. */
const PLACEMENT_KEYS = [
  'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf', 'position', 'top', 'left', 'right', 'bottom',
  'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical',
] as const;

function splitStyle(style: StyleProp<ViewStyle>) {
  const visual: Record<string, unknown> = { ...(StyleSheet.flatten(style) ?? {}) };
  const placement: Record<string, unknown> = {};
  for (const key of PLACEMENT_KEYS) {
    if (key in visual) {
      placement[key] = visual[key];
      delete visual[key];
    }
  }
  if (placement.flex !== undefined || placement.flexGrow !== undefined) visual.flexGrow = 1;
  return { placement: placement as ViewStyle, visual: visual as ViewStyle };
}

/** Press feedback on press-in, 120 ms, transform and opacity only. */
export function PressableScale({ children, style, feedback = 'scale', disabled, ...props }: PressableScaleProps) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const active = pressed && !disabled;
  const { placement, visual } = splitStyle(style);

  return (
    <Pressable
      {...props}
      accessibilityLabel={props.accessibilityLabel === undefined ? undefined : speakable(props.accessibilityLabel)}
      // Android asks for 48 dp: the 44 pt controls reach it without growing on screen.
      hitSlop={props.hitSlop ?? (Platform.OS === 'android' ? 2 : undefined)}
      style={placement}
      disabled={disabled}
      onPressIn={(e) => {
        setPressed(true);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        props.onPressOut?.(e);
      }}
      pressRetentionOffset={{ top: 16, bottom: 16, left: 16, right: 16 }}
    >
      <Animated.View
        style={[
          visual,
          {
            transform: [{ scale: active && feedback === 'scale' && !reduced ? 0.97 : 1 }],
            opacity: disabled ? 0.4 : active && (feedback === 'dim' || reduced) ? 0.6 : 1,
            transitionProperty: ['transform', 'opacity'],
            transitionDuration: motion.press,
            transitionTimingFunction: motion.easeOut,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
