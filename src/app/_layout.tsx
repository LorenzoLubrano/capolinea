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
import { useTheme } from '@/theme';

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
        <Stack.Screen
          name="add-expense"
          options={{
            presentation: 'formSheet',
            sheetGrabberVisible: true,
            sheetAllowedDetents: [1],
            sheetCornerRadius: 28,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
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
