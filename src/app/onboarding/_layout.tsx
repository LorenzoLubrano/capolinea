import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/** The onboarding steps are a hierarchy: each step pushes the next, back goes back. */
export default function OnboardingLayout() {
  const { colors } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
