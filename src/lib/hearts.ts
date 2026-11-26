/**
 * Cuori: aggiornamento ottimistico in locale, poi conferma del server.
 * Quanti cuori ha un utente lo decide SEMPRE il server: qui si applica solo
 * il tocco in attesa della risposta, e si torna indietro se il server rifiuta.
 */
export type HeartsState = {
  /** cuori che restano, come li ha detti il server (null = non lo sappiamo ancora) */
  available: number | null;
  /** id dei beat o dei brani a cui l'utente ha dato il cuore */
  given: Record<string, true>;
  /** conteggi semplici, solo se il server li manda */
  counts: Record<string, number>;
};

export const emptyHearts = (): HeartsState => ({ available: null, given: {}, counts: {} });

export function toggleOptimistic(state: HeartsState, id: string): HeartsState {
  const had = !!state.given[id];
  const given = { ...state.given };
  if (had) delete given[id];
  else given[id] = true;
  const counts = { ...state.counts };
  if (id in counts) counts[id] = Math.max(0, counts[id] + (had ? -1 : 1));
  const available = state.available == null ? null : Math.max(0, state.available + (had ? 1 : -1));
  return { available, given, counts };
}

/** Dopo la risposta del server: i suoi numeri vincono sui nostri. */
export function confirmFromServer(
  state: HeartsState,
  id: string,
  server: { available?: number | null; count?: number | null; given?: boolean | null },
): HeartsState {
  const next: HeartsState = { available: state.available, given: { ...state.given }, counts: { ...state.counts } };
  if (server.available != null) next.available = server.available;
  if (server.count != null) next.counts[id] = server.count;
  if (server.given === true) next.given[id] = true;
  if (server.given === false) delete next.given[id];
  return next;
}

/**
 * Il server ha rifiutato il tocco: si annulla esattamente quello che `toggleOptimistic`
 * aveva applicato (né più né meno), lasciando stare gli altri tocchi in corso.
 */
export function rollback(current: HeartsState, id: string, before: HeartsState, applied: HeartsState): HeartsState {
  const next: HeartsState = { available: current.available, given: { ...current.given }, counts: { ...current.counts } };
  if (before.given[id]) next.given[id] = true;
  else delete next.given[id];
  if (id in before.counts && id in next.counts) next.counts[id] = Math.max(0, next.counts[id] + (before.counts[id] - applied.counts[id]));
  if (next.available != null && before.available != null && applied.available != null) {
    next.available = Math.max(0, next.available + (before.available - applied.available));
  }
  return next;
}
