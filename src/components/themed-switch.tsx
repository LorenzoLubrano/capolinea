import { Platform, Switch, type SwitchProps } from 'react-native';

import { useTheme } from '@/theme';

/**
 * The system switch in the app's ink, on every platform: Android and the web would otherwise paint
 * the thumb in their own accent colour. Off in dark mode the thumb turns grey, or it would vanish
 * into the dark track.
 */
export function ThemedSwitch(props: Omit<SwitchProps, 'trackColor' | 'thumbColor'>) {
  const { colors, scheme } = useTheme();
  const thumb = props.value || scheme === 'light' ? colors.surface : colors.inkSecondary;
  // React Native Web colours the "on" thumb with its own prop.
  const web = Platform.OS === 'web' ? { activeThumbColor: colors.surface } : null;
  return <Switch {...props} {...web} trackColor={{ true: colors.ink, false: colors.track }} thumbColor={thumb} ios_backgroundColor={colors.track} />;
}
