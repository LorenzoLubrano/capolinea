import { router } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/glass';
import { Icon, type IconName } from '@/components/icon';
import { PressableScale } from '@/components/pressable-scale';
import { AppText } from '@/components/text';
import { it } from '@/i18n/it';
import { haptics } from '@/services/haptics';
import { layout, radius, spacing, useTheme } from '@/theme';

/** The minimal slice of the tab navigator's props this bar uses. */
interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
}

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: it.tabs.home, icon: 'House' },
  transactions: { label: it.tabs.transactions, icon: 'ListBullets' },
  budget: { label: it.tabs.budget, icon: 'Target' },
  analytics: { label: it.tabs.analytics, icon: 'ChartBar' },
};

/**
 * A docked glass tab bar, the same on iOS and Android (documented platform-neutral treatment):
 * four sections and the + in the middle, the only action: it opens a new expense.
 */
export function LineTabBar({ state, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const routes = state.routes.filter((r) => r.name in TABS);
  const items = [...routes.slice(0, 2), null, ...routes.slice(2)];

  return (
    <Glass
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingBottom: insets.bottom,
        borderTopWidth: 1,
        borderTopColor: colors.glassBorder,
      }}
    >
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          height: layout.tabBarHeight,
          width: '100%',
          maxWidth: layout.maxContentWidth,
          alignSelf: 'center',
          paddingHorizontal: spacing.sm,
        }}
      >
        {items.map((route) => {
          if (!route) {
            return (
              <View key="add" style={{ flex: 1, alignItems: 'center' }}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={it.tabs.add}
                  // Straight to a new expense: the most common entry costs no menu. Income,
                  // transfer, subscription and the recent ones are inside the sheet.
                  onPress={() => {
                    haptics.light();
                    router.push('/add-expense');
                  }}
                  style={{
                    width: 56,
                    height: 48,
                    borderRadius: radius.control,
                    borderCurve: 'continuous',
                    backgroundColor: colors.ink,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="Plus" color={colors.onInk} size={24} weight="bold" />
                </PressableScale>
              </View>
            );
          }
          const focused = state.routes[state.index]?.key === route.key;
          const tab = TABS[route.name];
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              feedback="dim"
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 }}
            >
              <Icon name={tab.icon} size={24} color={focused ? colors.ink : colors.inkSecondary} weight={focused ? 'fill' : 'regular'} />
              <AppText variant="tab" tone={focused ? 'primary' : 'secondary'} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                {tab.label}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </Glass>
  );
}
