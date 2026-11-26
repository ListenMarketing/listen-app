import { confirmFromServer, rollback, toggleOptimistic, type HeartsState } from '@/lib/hearts';

const start: HeartsState = { available: 5, given: { a: true }, counts: { a: 10, b: 3 } };

describe('cuori: aggiornamento ottimistico', () => {
  it('dare un cuore toglie un cuore disponibile e alza il conteggio', () => {
    const next = toggleOptimistic(start, 'b');
    expect(next.available).toBe(4);
    expect(next.given.b).toBe(true);
    expect(next.counts.b).toBe(4);
  });

  it('togliere un cuore lo restituisce', () => {
    const next = toggleOptimistic(start, 'a');
    expect(next.available).toBe(6);
    expect(next.given.a).toBeUndefined();
    expect(next.counts.a).toBe(9);
  });

  it('non inventa conteggi che il server non ha mandato', () => {
    const next = toggleOptimistic({ available: null, given: {}, counts: {} }, 'x');
    expect(next.available).toBeNull();
    expect(next.counts.x).toBeUndefined();
  });

  it('non modifica lo stato di partenza', () => {
    toggleOptimistic(start, 'b');
    expect(start).toEqual({ available: 5, given: { a: true }, counts: { a: 10, b: 3 } });
  });

  it('i numeri del server vincono su quelli locali', () => {
    const optimistic = toggleOptimistic(start, 'b');
    const confirmed = confirmFromServer(optimistic, 'b', { available: 2, count: 7, given: true });
    expect(confirmed.available).toBe(2);
    expect(confirmed.counts.b).toBe(7);
    expect(confirmed.given.b).toBe(true);
  });

  it('il rifiuto del server rimette tutto com’era, anche con zero cuori', () => {
    const empty: HeartsState = { available: 0, given: {}, counts: { b: 3 } };
    const applied = toggleOptimistic(empty, 'b');
    expect(rollback(applied, 'b', empty, applied)).toEqual(empty);
    const applied2 = toggleOptimistic(start, 'b');
    expect(rollback(applied2, 'b', start, applied2)).toEqual(start);
  });
});
