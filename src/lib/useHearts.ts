import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/api/client';
import { api } from '@/api/endpoints';
import { confirmFromServer, emptyHearts, rollback, toggleOptimistic, type HeartsState } from './hearts';

type Item = { id: string; hearted: boolean; hearts: number | null };

/**
 * Cuori di una lista (beat o brani): il tocco si vede subito, poi il server conferma
 * o rifiuta. Se rifiuta (es. il sesto cuore su 5) si torna indietro e si mostra il suo messaggio.
 */
export function useHearts(type: 'beat' | 'brano', items: Item[] | null, serverAvailable: number | null, region?: string | null) {
  const [state, setState] = useState<HeartsState>(emptyHearts);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, true>>({});
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // quando arriva una lista nuova dal server, i suoi dati sostituiscono i nostri
  useEffect(() => {
    if (!items) return;
    const given: Record<string, true> = {};
    const counts: Record<string, number> = {};
    for (const it of items) {
      if (it.hearted) given[it.id] = true;
      if (it.hearts != null) counts[it.id] = it.hearts;
    }
    setState({ available: serverAvailable, given, counts });
  }, [items, serverAvailable]);

  const toggle = useCallback(
    async (id: string) => {
      if (pending[id]) return;
      const before = stateRef.current;
      const wasGiven = !!before.given[id];
      setError(null);
      setPending((p) => ({ ...p, [id]: true }));
      const applied = toggleOptimistic(before, id);
      setState(applied);
      try {
        const res = wasGiven ? await api.removeHeart(type, id) : await api.giveHeart(type, id, region);
        setState((cur) => confirmFromServer(cur, id, res));
      } catch (e) {
        // rollback del solo tocco rifiutato
        setState((cur) => rollback(cur, id, before, applied));
        // il messaggio è quello del server (es. «hai finito i cuori»)
        setError(errorMessage(e));
      } finally {
        setPending((p) => {
          const n = { ...p };
          delete n[id];
          return n;
        });
      }
    },
    [pending, region, type],
  );

  return { hearts: state, toggle, error, clearError: () => setError(null), pending };
}
