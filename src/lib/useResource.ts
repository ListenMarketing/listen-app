import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/api/client';
import { readCache, writeCache } from './cache';

export type Resource<T> = {
  data: T | null;
  /** ora dell'ultimo aggiornamento riuscito (ms) */
  updatedAt: number | null;
  loading: boolean;
  /** true quando si sta mostrando la copia locale perché l'ultimo aggiornamento è fallito */
  stale: boolean;
  error: string | null;
  refresh: () => Promise<T | null>;
  setData: (updater: (prev: T | null) => T | null) => void;
};

type Slot<T> = {
  key: string | null;
  data: T | null;
  updatedAt: number | null;
  /** la prima richiesta per questa chiave è finita (bene o male) */
  settled: boolean;
  busy: boolean;
  stale: boolean;
  error: string | null;
};

const emptySlot = <T,>(key: string | null): Slot<T> => ({ key, data: null, updatedAt: null, settled: false, busy: false, stale: false, error: null });

/**
 * Carica prima la copia locale (così l'app si apre anche senza rete), poi chiede
 * al server. `key` null = niente da caricare.
 *
 * Lo stato è legato alla chiave: nel momento in cui la chiave cambia, `data` torna
 * subito vuoto e `loading` è subito vero, senza un passaggio intermedio «né dati né caricamento».
 */
export function useResource<T>(key: string | null, fetcher: () => Promise<T>): Resource<T> {
  const [slot, setSlot] = useState<Slot<T>>(() => emptySlot<T>(key));
  const fetcherRef = useRef(fetcher);
  const keyRef = useRef(key);
  // dichiarato per primo: gira prima dell'effetto di caricamento qui sotto
  useEffect(() => {
    fetcherRef.current = fetcher;
    keyRef.current = key;
  });

  /** aggiorna lo stato solo se la chiave è ancora quella per cui è partita la richiesta */
  const patch = useCallback((k: string, change: (s: Slot<T>) => Slot<T>) => {
    setSlot((s) => change(s.key === k ? s : emptySlot<T>(k)));
  }, []);

  const refresh = useCallback(async (): Promise<T | null> => {
    const k = keyRef.current;
    if (!k) return null;
    patch(k, (s) => ({ ...s, busy: true }));
    try {
      const fresh = await fetcherRef.current();
      if (keyRef.current !== k) return fresh;
      const at = await writeCache(k, fresh);
      patch(k, (s) => ({ ...s, data: fresh, updatedAt: at, settled: true, busy: false, stale: false, error: null }));
      return fresh;
    } catch (e) {
      if (keyRef.current === k) patch(k, (s) => ({ ...s, settled: true, busy: false, stale: true, error: errorMessage(e) }));
      return null;
    }
  }, [patch]);

  useEffect(() => {
    if (!key) return;
    let alive = true;
    (async () => {
      const cached = await readCache<T>(key);
      if (!alive) return;
      if (cached) patch(key, (s) => (s.data == null ? { ...s, data: cached.data, updatedAt: cached.at } : s));
      await refresh();
    })();
    return () => {
      alive = false;
    };
  }, [key, refresh, patch]);

  const setData = useCallback(
    (updater: (prev: T | null) => T | null) => {
      const k = keyRef.current;
      if (!k) return;
      patch(k, (s) => {
        const next = updater(s.data);
        if (next != null) void writeCache(k, next);
        return { ...s, data: next };
      });
    },
    [patch],
  );

  // se la chiave è cambiata in questo render, lo stato vecchio non vale più
  const current = slot.key === key ? slot : emptySlot<T>(key);
  return {
    data: current.data,
    updatedAt: current.updatedAt,
    loading: !!key && (current.busy || !current.settled),
    stale: current.stale,
    error: current.error,
    refresh,
    setData,
  };
}
