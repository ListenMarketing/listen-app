import AsyncStorage from '@react-native-async-storage/async-storage';

/** Cache locale: l'app si apre anche senza rete e mostra l'ultima versione con l'ora. */
const PREFIX = 'listen.cache.';

export type Cached<T> = { data: T; at: number };

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Cached<T>) : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, data: T): Promise<number> {
  const at = Date.now();
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, at }));
  } catch {
    // la cache è un di più: se non si salva, l'app funziona lo stesso
  }
  return at;
}

export async function removeCache(key: string) {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {}
}

/** Alla disconnessione o alla cancellazione dell'account si svuota tutto ciò che è dell'utente. */
export async function clearUserData() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith('listen.'));
    if (mine.length) await AsyncStorage.multiRemove(mine);
  } catch {}
}

export async function getFlag(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('listen.flag.' + key);
  } catch {
    return null;
  }
}

export async function setFlag(key: string, value: string) {
  try {
    await AsyncStorage.setItem('listen.flag.' + key, value);
  } catch {}
}
