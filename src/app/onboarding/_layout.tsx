import { Stack } from 'expo-router';

import { useReduceMotion } from '@/services/a11y';
import { motion, useTheme } from '@/theme';

/** The onboarding steps are a hierarchy: each step pushes the next, back goes back. */
export default function OnboardingLayout() {
  const { colors } = useTheme();
  const reduceMotion = useReduceMotion();
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: reduceMotion ? 'fade' : motion.push }}
    />
  );
}
