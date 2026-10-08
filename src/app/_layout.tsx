import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/archivo';
import { ArchivoNarrow_600SemiBold, ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastHost } from '@/components/toast-host';
import { DataProvider } from '@/data/provider';
import { it } from '@/i18n/it';
import { fonts, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

function AppStack() {
  const { colors, scheme } = useTheme();
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: { ...base.colors, background: colors.background, card: colors.background, text: colors.ink, border: colors.hairline, primary: colors.ink },
  };
  // iOS 26: a transparent sheet background becomes Liquid Glass. Elsewhere sheets are solid.
  const sheetBackground = Platform.OS === 'ios' && isLiquidGlassAvailable() ? 'transparent' : colors.background;
  const sheet = {
    presentation: 'formSheet',
    sheetGrabberVisible: true,
    sheetCornerRadius: 28,
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
  } as const;

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="add"
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.62, 1],
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: sheetBackground },
          }}
        />
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
        <Stack.Screen name="transaction-filters" options={{ ...sheet, sheetAllowedDetents: [0.75, 1] }} />
        <Stack.Screen name="profile" options={{ ...pushed, title: it.profile.title }} />
        <Stack.Screen name="settings/appearance" options={{ ...pushed, title: it.appearance.title }} />
      </Stack>
      <ToastHost />
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

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DataProvider>
        <AppStack />
      </DataProvider>
    </GestureHandlerRootView>
  );
}
