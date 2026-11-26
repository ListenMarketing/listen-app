import { Tabs, router } from 'expo-router';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from '@/components/Icon';
import { getFlag, setFlag } from '@/lib/cache';
import { getPushStatus, registerPushIfGranted } from '@/lib/notifications';
import { usePlayer } from '@/lib/player';
import { colors, fonts } from '@/lib/theme';

const TABS: { name: string; key: string; icon: IconName }[] = [
  { name: 'index', key: 'home', icon: 'home' },
  { name: 'producer', key: 'producer', icon: 'note' },
  { name: 'artisti', key: 'artisti', icon: 'trophy' },
  { name: 'marketing', key: 'marketing', icon: 'megaphone' },
  { name: 'io', key: 'io', icon: 'user' },
];

/** Menu in basso: Home, Producer, Artisti, Marketing, Io. */
export default function TabsLayout() {
  const { t } = useTranslation();
  const { stop } = usePlayer();

  useEffect(() => {
    // il token push si aggiorna a ogni avvio (se il permesso c'è già)
    void registerPushIfGranted();
    // il permesso si chiede una volta, dopo il primo avvio completato, con la schermata che spiega
    void (async () => {
      if ((await getFlag('notifications.asked')) || (await getPushStatus()) !== 'undetermined') return;
      await setFlag('notifications.asked', '1');
      router.push('/notifiche');
    })();
  }, []);

  return (
    <Tabs
      screenListeners={{ tabPress: () => stop() }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.borderSoft, borderTopWidth: 1, minHeight: 62 },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.key}`),
            tabBarAccessibilityLabel: t(`tabs.${tab.key}`),
            tabBarButtonTestID: `tab-${tab.key}`,
            tabBarIcon: ({ color }) => <Icon name={tab.icon} size={22} color={typeof color === 'string' ? color : colors.muted} strokeWidth={1.8} />,
          }}
        />
      ))}
    </Tabs>
  );
}
