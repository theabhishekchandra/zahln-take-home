import { useTranslation } from '@zahln/i18n';
import { TabBar, type IconName } from '@zahln/ui-native';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';

import { RequireUser } from '@/lib/require-user';

const TABS: Record<string, { readonly icon: IconName; readonly label: 'tabs.home' | 'tabs.activity' | 'tabs.profile' }> = {
  home: { icon: 'home', label: 'tabs.home' },
  activity: { icon: 'activity', label: 'tabs.activity' },
  profile: { icon: 'profile', label: 'tabs.profile' },
};

export default function TabsLayout() {
  return (
    <RequireUser>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
        <Tabs.Screen name="home" />
        <Tabs.Screen name="activity" />
        <Tabs.Screen name="profile" />
      </Tabs>
    </RequireUser>
  );
}

/** The design's tab bar, driven by the navigator's state. */
function AppTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { t } = useTranslation();
  const items = state.routes.flatMap((route, index) => {
    const tab = TABS[route.name];
    if (!tab) return [];
    const selected = index === state.index;
    return [
      {
        key: route.key,
        label: t(tab.label),
        icon: tab.icon,
        selected,
        onPress: () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!selected && !event.defaultPrevented) navigateToTab(route.key);
        },
      },
    ];
  });
  return <TabBar items={items} accessibilityLabel={t('tabs.label')} />;
}
