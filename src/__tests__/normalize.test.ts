import { normalizeMe, normalizeRanking, normalizeRegions, normalizeRole, normalizeState, retryAfterSeconds, serverMessage, setApiLanguage } from '@/api/normalize';

describe('risposte delle API del Blocco 125', () => {
  beforeEach(() => setApiLanguage('it'));

  it('legge fase, permessi, cuori e versione minima da state', () => {
    const s = normalizeState({
      fase: 'cuori_beat',
      date: { cuori_beat: { inizio: '2027-02-01T11:00:00Z', fine: '2027-02-13T22:59:00Z' } },
      permessi: { puo_caricare_beat: false, puo_dare_cuori: true, puo_prenotare_slot: true, puo_caricare_brano: false },
      cuori_disponibili: 5,
      versione_minima: '1.2.0',
      playlist: { nome: 'Chiamarsi Artisti 2027', url: 'https://example.com/playlist' },
    });
    expect(s.phase).toBe('cuori_beat');
    expect(s.can.giveHearts).toBe(true);
    expect(s.can.uploadBeat).toBe(false);
    expect(s.heartsAvailable).toBe(5);
    expect(s.minVersion).toBe('1.2.0');
    expect(s.playlist.url).toBe('https://example.com/playlist');
    expect(s.nextPhase).toBe('top10');
    expect(s.nextPhaseAt).toBe('2027-02-13T22:59:00Z');
  });

  it('senza permessi espliciti non concede niente', () => {
    const s = normalizeState({ fase: 'consegna_beat' });
    expect(Object.values(s.can).every((v) => v === false)).toBe(true);
    expect(s.heartsAvailable).toBeNull();
  });

  it('una fase sconosciuta diventa «preparazione»', () => {
    expect(normalizeState({ fase: 'boh' }).phase).toBe('preparazione');
  });

  it('riconosce i ruoli del sito', () => {
    expect(normalizeRole('emergente')).toBe('artista');
    expect(normalizeRole('agency')).toBe('studio');
    expect(normalizeRole('producer')).toBe('producer');
    expect(normalizeRole('pubblico')).toBe('pubblico');
    expect(normalizeRole(null)).toBeNull();
  });

  it('legge lo stato della playlist e la verifica dello studio da me', () => {
    const me = normalizeMe({ profilo: { ruolo: 'agency', approvato: false, playlist_opened_at: '2027-01-10T16:42:00Z', playlist_confirmed_at: null } });
    expect(me.role).toBe('studio');
    expect(me.pendingApproval).toBe(true);
    expect(me.playlistOpenedAt).toBe('2027-01-10T16:42:00Z');
    expect(me.playlistConfirmedAt).toBeNull();
  });

  it('calcola posti liberi e regione piena', () => {
    const r = normalizeRegions({ regioni: [{ regione: 'Lombardia', capienza: 200, iscritti: 156 }, { regione: 'Lazio', capienza: 100, iscritti: 100 }], messaggio_lista_attesa: { it: 'Regione piena: paghi ed entri in lista d’attesa', en: 'Region full' } });
    expect(r.items[0]).toMatchObject({ name: 'Lombardia', free: 44, full: false });
    expect(r.items[1]).toMatchObject({ name: 'Lazio', free: 0, full: true, waitlistText: 'Regione piena: paghi ed entri in lista d’attesa' });
    expect(r.totalEnrolled).toBe(256);
  });

  it('della classifica tiene solo nomi e titoli: mai punteggi o posizioni', () => {
    const r = normalizeRanking({ regione: 'Lombardia', passati: [{ id: 1, nome_arte: 'Seven', titolo: 'Via Padova', posizione: 1, punteggio_pesato: 1412, cuori_semplici: 900 }], wildcard: [] });
    expect(r.passed[0]).toEqual({ id: '1', artistName: 'Seven', title: 'Via Padova', detail: null, previewUrl: null, spotifyUrl: null });
    expect(JSON.stringify(r)).not.toMatch(/1412|900|posizione|punteggio/);
  });

  it('mostra il messaggio del server nella lingua dell’app', () => {
    expect(serverMessage({ error: { message: { it: 'Hai finito i cuori', en: 'No hearts left' } } })).toBe('Hai finito i cuori');
    setApiLanguage('en');
    expect(serverMessage({ message: { it: 'Hai finito i cuori', en: 'No hearts left' } })).toBe('No hearts left');
    expect(serverMessage({ error: 'Codice già usato' })).toBe('Codice già usato');
    expect(serverMessage({})).toBeNull();
  });

  it('legge il tempo che resta del blocco del codice', () => {
    expect(retryAfterSeconds({ retry_after: 3540 })).toBe(3540);
    expect(retryAfterSeconds({})).toBeNull();
  });
});
