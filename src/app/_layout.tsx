import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { ArchivoNarrow_600SemiBold, ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';

import { DiscardDialog } from '@/components/discard-dialog';
import { ToastHost } from '@/components/toast-host';
import { DataProvider } from '@/data/provider';
import { NotificationsPlanner } from '@/features/notifications/notifications-planner';
import { LockGate } from '@/features/security/lock-screen';
import { it } from '@/i18n/it';
import { useReduceMotion } from '@/services/a11y';
import { useAppSwitcherCover } from '@/services/security';
import { clearExports } from '@/services/share-file';
import { useLock } from '@/state/lock';
import { prototypeFaults } from '@/state/prototype';
import { useSettings } from '@/state/settings';
import { fonts, motion, radius, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

// Expected, not a problem: the app sets the motion mode itself (see ReducedMotionConfig below). In
// development the warning sat at the bottom of the screen, over the keypads.
LogBox.ignoreLogs(["[Reanimated] Reduced motion setting is overwritten with mode 'never'"]);

function AppStack() {
  const { colors, scheme } = useTheme();
  useAppSwitcherCover(useSettings((s) => s.coverInSwitcher));
  const onboarded = useSettings((s) => s.onboarded);
  const reduceMotion = useReduceMotion();
  // The window behind every screen follows the theme: a screen going back leaves a frame or two of
  // it uncovered, which flashed white in the dark theme.
  useEffect(() => void SystemUI.setBackgroundColorAsync(colors.background), [colors.background]);
  // Exports left from the last session are deleted: the app keeps no copy of the data.
  useEffect(() => clearExports(), []);
  // Rendered once the fonts are loaded and the database is open. Locked, the lock screen hides it.
  useEffect(() => {
    if (!useLock.getState().coldStart) SplashScreen.hideAsync();
  }, []);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.background, text: colors.ink, border: colors.hairline, primary: colors.ink },
  };
  const sheet = {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetCornerRadius: radius.sheet,
    contentStyle: { backgroundColor: colors.background },
  } as const;
  // Pushed screens (profile, settings): native header and back gesture, same look on both platforms.
  const pushed = {
    headerShown: true,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.ink,
    headerTitleStyle: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: colors.background },
    animation: reduceMotion ? 'fade' : motion.push,
  } as const;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Animations without their own setting follow Reduce Motion as it is now, not as it was at launch. */}
      <ReducedMotionConfig mode={reduceMotion ? ReduceMotion.Always : ReduceMotion.Never} />
      <Stack screenOptions={{ headerShown: false }}>
        {/* The app itself only after the onboarding; wiping the data turns the guard off again. */}
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-expense" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="add-income" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="add-transfer" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="add-refund" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="add-subscription" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="split" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="budget-edit" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="category/[id]" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="subscription/[id]" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="goal/[id]" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="goal-edit" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="goal-contribution" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="transaction/[id]" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="analysis/category/[id]" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="analysis/merchant/[name]" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="transaction-filters" options={{ ...sheet, sheetAllowedDetents: [0.75, 1] }} />
          <Stack.Screen name="profile" options={{ ...pushed, title: it.profile.title }} />
          <Stack.Screen name="settings/appearance" options={{ ...pushed, title: it.appearance.title }} />
          <Stack.Screen name="settings/security" options={{ ...pushed, title: it.security.title }} />
          <Stack.Screen name="settings/privacy" options={{ ...pushed, title: it.privacySettings.title }} />
          <Stack.Screen name="settings/notifications" options={{ ...pushed, title: it.notificationSettings.title }} />
          <Stack.Screen name="settings/currency" options={{ ...pushed, title: it.currencySettings.title }} />
          <Stack.Screen name="settings/export" options={{ ...pushed, title: it.exportScreen.title }} />
          <Stack.Screen name="settings/delete" options={{ ...pushed, title: it.deleteData.title }} />
          <Stack.Screen name="settings/info" options={{ ...pushed, title: it.info.title }} />
          <Stack.Screen name="accounts" options={{ ...pushed, title: it.accounts.title }} />
          <Stack.Screen name="account/[id]" options={{ ...pushed, title: '' }} />
          <Stack.Screen name="categories" options={{ ...pushed, title: it.categoryList.title }} />
          <Stack.Screen name="shared" options={{ ...pushed, title: it.shared.title }} />
          <Stack.Screen name="person/[id]" options={{ ...pushed, title: '' }} />
          <Stack.Screen name="account-edit" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="category-edit" options={{ ...sheet, sheetAllowedDetents: [1] }} />
          <Stack.Screen name="person-edit" options={{ ...sheet, sheetAllowedDetents: [0.5, 1] }} />
          <Stack.Screen name="settle" options={{ ...sheet, sheetAllowedDetents: [1] }} />
        </Stack.Protected>
        {/* Development only: a release build has no prototype panel, not even through a link. */}
        <Stack.Protected guard={onboarded && __DEV__}>
          <Stack.Screen name="prototype" options={{ ...pushed, title: it.prototype.title }} />
          {/* The sync is simulated until it exists: not reachable in a release build. */}
          <Stack.Screen name="settings/sync" options={{ ...pushed, title: it.sync.title }} />
          <Stack.Screen name="settings/sync-signin" options={{ ...sheet, sheetAllowedDetents: [0.6, 1] }} />
        </Stack.Protected>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Screen name="settings/pin" options={{ ...sheet, sheetAllowedDetents: [1] }} />
        <Stack.Screen name="restore" options={{ ...pushed, title: it.restore.title }} />
        {/* Above everything, sheets included; no gesture, and no animation: not a frame of the app shows. */}
        <Stack.Screen
          name="lock"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'none' }}
          // Started locked: the splash screen goes once the lock screen is on screen, not merely mounted.
          listeners={{ transitionEnd: (e) => (!e.data.closing && useLock.getState().coldStart ? void SplashScreen.hideAsync() : undefined) }}
        />
      </Stack>
      <ToastHost />
      <DiscardDialog />
      <LockGate />
      <NotificationsPlanner />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
    ArchivoNarrow_600SemiBold,
    ArchivoNarrow_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DataProvider faults={__DEV__ ? prototypeFaults : undefined}>
        <AppStack />
      </DataProvider>
    </GestureHandlerRootView>
  );
}
