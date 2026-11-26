import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/api/endpoints';
import { getApiLanguage } from '@/api/normalize';

/**
 * Notifiche push (expo-notifications). Il permesso NON si chiede all'apertura:
 * lo chiede la schermata «Attiva le notifiche», dopo il primo avvio completato.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PushStatus = 'granted' | 'denied' | 'undetermined';

export async function getPushStatus(): Promise<PushStatus> {
  try {
    const p = await Notifications.getPermissionsAsync();
    if (p.granted) return 'granted';
    return p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

/** Registra (o aggiorna) il token con l'API `devices`. Si chiama a ogni avvio se il permesso c'è. */
export async function registerPushToken(): Promise<boolean> {
  try {
    if (!Device.isDevice) return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Listen',
        importance: AndroidImportance.DEFAULT,
      });
    }
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (!token?.data) return false;
    await api.registerDevice(token.data, Platform.OS, getApiLanguage());
    return true;
  } catch {
    return false;
  }
}

export async function requestPushAndRegister(): Promise<PushStatus> {
  try {
    const p = await Notifications.requestPermissionsAsync();
    if (!p.granted) return p.canAskAgain ? 'undetermined' : 'denied';
    await registerPushToken();
    return 'granted';
  } catch {
    return 'undetermined';
  }
}

export async function registerPushIfGranted() {
  if ((await getPushStatus()) === 'granted') await registerPushToken();
}

/** L'indirizzo da aprire quando si tocca una notifica (link universale o schema dell'app). */
export function urlFromNotification(response: Notifications.NotificationResponse | null | undefined): string | null {
  const data = response?.notification?.request?.content?.data as Record<string, unknown> | undefined;
  const url = data?.url ?? data?.link;
  return typeof url === 'string' ? url : null;
}

export { Notifications };
