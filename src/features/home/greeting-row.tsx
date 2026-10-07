import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { haptics } from '@/services/haptics';
import { useSettings } from '@/state/settings';
import { radius, spacing, useTheme } from '@/theme';

function greetingFor(hour: number) {
  if (hour < 13) return it.home.greeting.morning;
  if (hour < 18) return it.home.greeting.afternoon;
  return it.home.greeting.evening;
}

export function GreetingRow({ name }: { name: string }) {
  const { colors } = useTheme();
  const privacy = useSettings((s) => s.privacy);
  const togglePrivacy = useSettings((s) => s.togglePrivacy);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <AppText variant="callout" tone="secondary">
        {`${greetingFor(new Date().getHours())}, ${name}`}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <PressableScale
          accessibilityRole="switch"
          accessibilityLabel={privacy ? it.home.privacyShow : it.home.privacyHide}
          accessibilityState={{ checked: privacy }}
          onPress={() => {
            haptics.light();
            togglePrivacy();
          }}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name={privacy ? 'EyeSlash' : 'Eye'} color={colors.ink} size={22} />
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={it.home.profile}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.full,
              backgroundColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText variant="caption" tone="onInk">
              {name.charAt(0)}
            </AppText>
          </View>
        </PressableScale>
      </View>
    </View>
  );
}
