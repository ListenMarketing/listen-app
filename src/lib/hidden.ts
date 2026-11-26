import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/** Contenuti che l'utente ha nascosto per sé (restano nascosti su questo telefono). */
const KEY = 'listen.hidden';

export function useHidden() {
  const [hidden, setHidden] = useState<Record<string, true>>({});
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => raw && setHidden(JSON.parse(raw)))
      .catch(() => {});
  }, []);
  const hide = useCallback((id: string) => {
    setHidden((prev) => {
      const next = { ...prev, [id]: true as const };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);
  return { hidden, hide };
}
