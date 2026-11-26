import Constants from 'expo-constants';

/**
 * Variabili per ambiente. Sono tutte pubbliche per costruzione (EXPO_PUBLIC_*):
 * l'URL del sito, l'URL del progetto Supabase e la chiave anon.
 */
const trim = (v: string | undefined) => (v ?? '').replace(/\/+$/, '');

export const env = {
  appEnv: (Constants.expoConfig?.extra?.appEnv as string | undefined) ?? 'development',
  siteUrl: trim(process.env.EXPO_PUBLIC_SITE_URL),
  supabaseUrl: trim(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  iosAppStoreId: process.env.EXPO_PUBLIC_IOS_APP_STORE_ID ?? '',
  appVersion: Constants.expoConfig?.version ?? '0.0.0',
  androidPackage: 'com.listenmarketing.app',
  /** Dominio dei link universali: sempre quello di produzione. */
  universalLinkHost: 'www.listen-marketing.com',
  scheme: 'listenmarketing',
};

export const apiBase = () => `${env.siteUrl}/api/app/v1`;
