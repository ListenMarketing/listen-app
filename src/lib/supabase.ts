import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { env } from './env';

/**
 * Stesso progetto Supabase del sito: un solo account per sito e app.
 * Qui c'è solo la chiave anon. L'app non legge mai le tabelle: usa
 * Supabase solo per l'Auth e parla con le API /api/app/v1 del sito.
 */
export const supabase = createClient(
  env.supabaseUrl || 'https://invalid.supabase.co',
  env.supabaseAnonKey || 'anon',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

AppState.addEventListener('change', (s) => {
  if (s === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
