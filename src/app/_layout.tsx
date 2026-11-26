import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { useFonts } from 'expo-font';
import { Stack, router, useRootNavigationState, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@/i18n';
import { Loading } from '@/components/ui';
import { mapUrlToRoute } from '@/lib/links';
import { Notifications, urlFromNotification } from '@/lib/notifications';
import { PlayerProvider } from '@/lib/player';
import { colors } from '@/lib/theme';
import { SessionProvider, useSession, type Stage } from '@/state/session';

void SplashScreen.preventAutoHideAsync().catch(() => {});

/** Dove deve stare l'utente in ogni stadio (prima rotta = quella a cui si viene portati). */
const ROUTES_BY_STAGE: Record<Exclude<Stage, 'loading' | 'ready'>, string[]> = {
  signedOut: ['registrati', 'accedi', 'password'],
  confirmEmail: ['conferma-email'],
  error: ['errore'],
  update: ['aggiorna'],
  role: ['ruolo'],
  playlist: ['playlist'],
};

function Gate() {
  const { stage } = useSession();
  const segments = useSegments();
  const navReady = !!useRootNavigationState()?.key;

  // Chi non ha finito il primo avvio non vede il resto dell'app, e viceversa.
  useEffect(() => {
    if (!navReady || stage === 'loading') return;
    const first = (segments[0] as string | undefined) ?? '';
    if (stage === 'ready') {
      const outside = Object.values(ROUTES_BY_STAGE).some((list) => list.includes(first));
      if (outside) router.replace('/');
      return;
    }
    const allowed = ROUTES_BY_STAGE[stage];
    if (!allowed.includes(first)) router.replace(`/${allowed[0]}`);
  }, [stage, segments, navReady]);

  // Le notifiche aprono la schermata giusta tramite i link universali.
  useEffect(() => {
    if (stage !== 'ready' || !navReady) return;
    const go = (response: Notifications.NotificationResponse | null) => {
      const url = urlFromNotification(response);
      if (url) router.push(mapUrlToRoute(url) as never);
    };
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) {
        go(r);
        void Notifications.clearLastNotificationResponseAsync().catch(() => {});
      }
    }).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, [stage, navReady]);

  if (stage === 'loading') return <Loading />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Protected guard={stage === 'signedOut'}>
        <Stack.Screen name="registrati" />
        <Stack.Screen name="accedi" />
        <Stack.Screen name="password" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'confirmEmail'}>
        <Stack.Screen name="conferma-email" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'error'}>
        <Stack.Screen name="errore" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'update'}>
        <Stack.Screen name="aggiorna" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'role'}>
        <Stack.Screen name="ruolo" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'playlist'}>
        <Stack.Screen name="playlist" />
      </Stack.Protected>
      <Stack.Protected guard={stage === 'ready'}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="candidatura" />
        <Stack.Screen name="beat" />
        <Stack.Screen name="slot" />
        <Stack.Screen name="codice" />
        <Stack.Screen name="brano" />
        <Stack.Screen name="pagato" />
        <Stack.Screen name="classifica" />
        <Stack.Screen name="finale" />
        <Stack.Screen name="notifiche" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <PlayerProvider>
          <StatusBar style="light" />
          <Gate />
        </PlayerProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
