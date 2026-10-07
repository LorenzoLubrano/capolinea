import { Tabs } from 'expo-router';

import { LineTabBar } from '@/features/navigation/line-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs
      // Tabs are peers: switching never slides.
      screenOptions={{ headerShown: false, animation: 'none' }}
      tabBar={(props) => <LineTabBar state={props.state} navigation={props.navigation as never} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="transactions" />
      <Tabs.Screen name="budget" />
      <Tabs.Screen name="analytics" />
    </Tabs>
  );
}
