import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Configurazione dell'app «Listen».
 *
 * In questo repository stanno SOLO valori pubblici per costruzione:
 * l'URL del sito, l'URL del progetto Supabase e la chiave anon.
 * Nessuna chiave segreta, nessuna chiave Stripe, nessun service role.
 * Certificati e identificativi degli store vivono negli account Apple/Google e in EAS.
 */

const PROD_SITE = 'https://www.listen-marketing.com';
const APP_ENV = process.env.APP_ENV ?? 'development';

const siteUrl = (process.env.EXPO_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '');
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const isPlaceholder = (v: string) => !v || v.includes('DA_INSERIRE');

if (APP_ENV === 'production') {
  // Le build di produzione si fanno solo con le variabili di produzione.
  if (siteUrl !== PROD_SITE) {
    throw new Error(
      `Build di produzione: EXPO_PUBLIC_SITE_URL deve essere ${PROD_SITE} (trovato «${siteUrl}»).`,
    );
  }
  if (isPlaceholder(supabaseUrl) || isPlaceholder(supabaseAnonKey)) {
    throw new Error(
      'Build di produzione: mancano EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY (vedi eas.json).',
    );
  }
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  // «Listen» è il nome sotto l'icona. Se sugli store il nome da solo non è
  // disponibile, nella scheda dello store si usa «Listen Marketing».
  name: 'Listen',
  slug: 'listen',
  owner: process.env.EXPO_OWNER || undefined,
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'listenmarketing',
  userInterfaceStyle: 'dark',
  backgroundColor: '#0B0F2B',
  icon: './assets/icon.png',
  locales: {
    it: './locales/it.json',
    en: './locales/en.json',
  },
  ios: {
    bundleIdentifier: 'com.listenmarketing.app',
    supportsTablet: false,
    // Il Team ID non è un segreto ma lo inserisce Giuseppe (variabile o login EAS).
    appleTeamId: process.env.APPLE_TEAM_ID || undefined,
    associatedDomains: ['applinks:www.listen-marketing.com'],
    infoPlist: {
      CFBundleDisplayName: 'Listen',
      CFBundleAllowMixedLocalizations: true,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.listenmarketing.app',
    adaptiveIcon: {
      backgroundColor: '#0B0F2B',
      foregroundImage: './assets/android-icon-foreground.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // L'app non registra audio: niente microfono.
    blockedPermissions: ['android.permission.RECORD_AUDIO', 'android.permission.SYSTEM_ALERT_WINDOW'],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'www.listen-marketing.com', pathPrefix: '/app' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-build-properties',
      {
        // Expo SDK 58 richiede iOS 16.4 come minimo; Android 10 = API 29.
        ios: { deploymentTarget: '16.4' },
        android: { minSdkVersion: 29 },
      },
    ],
    [
      'expo-splash-screen',
      { backgroundColor: '#0B0F2B', image: './assets/splash-icon.png', imageWidth: 180 },
    ],
    ['expo-notifications', { color: '#E9FF5A' }],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Listen usa la galleria solo per scegliere la copertina del tuo brano.',
        cameraPermission: false,
        microphonePermission: false,
      },
    ],
    [
      'expo-audio',
      {
        microphonePermission: false,
        recordAudioAndroid: false,
        enableBackgroundPlayback: false,
      },
    ],
    'expo-font',
    'expo-localization',
    'expo-web-browser',
  ],
  experiments: { typedRoutes: false },
  extra: {
    appEnv: APP_ENV,
    eas: { projectId: process.env.EAS_PROJECT_ID || undefined },
  },
});
