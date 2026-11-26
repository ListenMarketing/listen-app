import { del, get, post, put } from './client';
import * as n from './normalize';
import type { ExternalStudio, Interest, Role, TrackData } from './types';

/**
 * Gli endpoint del punto 9 del Blocco 125. L'app non contiene regole:
 * fasi, permessi, cuori, posti e codici li decide il server.
 */
export const api = {
  state: async () => n.normalizeState(await get('state')),
  me: async () => n.normalizeMe(await get('me')),
  /** il ruolo si sceglie una volta sola e non si cambia dall'app */
  setRole: async (ruolo: Role) => n.normalizeMe(await put('me', { ruolo })),
  saveProfile: async (dati: { nome_arte?: string; citta?: string; regione?: string; instagram?: string; genere?: string; telefono?: string }) =>
    n.normalizeMe(await put('me', dati)),

  playlistOpened: () => post('playlist/opened'),
  playlistConfirm: () => post('playlist/confirm'),

  beats: async (q: { genere?: string | null; q?: string | null } = {}) => n.normalizeBeatList(await get('beats', { genere: q.genere, q: q.q })),
  top10: async () => n.normalizeBeatList(await get('top10')),
  myBeat: async () => n.normalizeMyBeat(await get('beats/mine')),
  /** 1 · chiede l'URL firmato per caricare il file nel bucket privato */
  beatUploadUrl: async (file: { file_name: string; content_type: string; size: number | null; durata_secondi: number | null }) =>
    n.normalizeUploadTarget(await post('beats/mine', { azione: 'upload_url', ...file })),
  /** 2 · conferma (o sostituisce) il beat con titolo, genere e bpm */
  confirmBeat: async (dati: { path: string | null; titolo: string; genere: string; bpm: number | null }) =>
    n.normalizeMyBeat(await put('beats/mine', dati)),
  deleteBeat: () => del('beats/mine'),

  giveHeart: async (target_type: 'beat' | 'brano', target_id: string, regione?: string | null) =>
    n.normalizeHeart(await post('hearts', { target_type, target_id, ...(regione ? { regione } : {}) })),
  removeHeart: async (target_type: 'beat' | 'brano', target_id: string) => n.normalizeHeart(await del('hearts', { target_type, target_id })),

  /** Segnalazione di un contenuto caricato da un utente (requisito degli store). */
  report: (target_type: 'beat' | 'brano', target_id: string, motivo: string, nota: string) =>
    post('reports', { target_type, target_id, motivo, nota }),

  regions: async () => n.normalizeRegions(await get('regions')),
  studios: async (regione?: string | null) => n.normalizeStudios(await get('contest/studios', { regione })),

  interest: async () => n.normalizeInterest(await get('contest/interest')),
  saveInterest: async (i: Interest) =>
    n.normalizeInterest(
      await post('contest/interest', {
        nome_arte: i.stageName,
        regione: i.region,
        citta: i.city,
        telefono: i.phone,
        instagram: i.instagram,
        email: i.email,
        genere: i.genre,
        vuole_partecipare: i.wantsToJoin,
        consenso_aggiornamenti: i.updatesConsent,
      }),
    ),

  /** Risponde con l'URL di Stripe Checkout del sito, da aprire nel browser. */
  checkout: async (pacchetto: string, regione: string, regolamento_accettato: boolean) => {
    const j: any = await post('contest/checkout', { pacchetto, regione, regolamento_accettato });
    const url = j?.url ?? j?.checkout_url ?? j?.data?.url;
    return typeof url === 'string' ? url : null;
  },

  redeem: async (d: {
    codice: string;
    regione: string;
    citta: string;
    telefono: string;
    email: string;
    instagram: string;
    da_quando_artista: string;
    studio_partner_id?: string | null;
    studio_esterno?: ExternalStudio | null;
  }) =>
    n.normalizeEntry(
      await post('contest/redeem', {
        ...d,
        studio_esterno: d.studio_esterno
          ? {
              nome: d.studio_esterno.name,
              indirizzo: d.studio_esterno.address,
              instagram: d.studio_esterno.instagram,
              telefono: d.studio_esterno.phone,
              email: d.studio_esterno.email || null,
            }
          : null,
      }),
    ),

  entry: async () => n.normalizeEntry(await get('contest/entry')),
  chooseBeat: async (beat_id: string) => n.normalizeEntry(await put('contest/entry', { beat_id })),

  track: async () => n.normalizeTrackStatus(await get('contest/track')),
  trackUploadUrl: async (tipo: 'wav' | 'copertina', file: { file_name: string; content_type: string; size: number | null; larghezza?: number; altezza?: number }) =>
    n.normalizeUploadTarget(await post('contest/track', { azione: 'upload_url', tipo, ...file })),
  submitTrack: async (d: TrackData, files: { wav_path: string | null; copertina_path: string | null }) =>
    n.normalizeTrackStatus(
      await put('contest/track', {
        titolo: d.title,
        nome_artista: d.artistName,
        spotify_profilo: d.spotifyProfileUrl || null,
        genere: d.genre,
        lingua: d.language,
        esplicito: d.explicit,
        autore_testo: d.lyricsAuthor,
        producer: d.producer,
        testo: d.lyrics,
        dichiarazioni: {
          brano_mio: d.declarations.mine,
          testo_non_offende: d.declarations.notOffensive,
          autorizzo_distribuzione: d.declarations.distribution,
        },
        ...files,
      }),
    ),

  tracks: async (regione?: string | null, q?: string | null) => n.normalizeTrackList(await get('contest/tracks', { regione, q })),
  ranking: async (regione?: string | null) => n.normalizeRanking(await get('contest/ranking', { regione })),

  marketing: async () => n.normalizeMarketing(await get('marketing')),
  /** Link usa-e-getta (5 minuti) per entrare nel sito già loggati. Mai per il pubblico. */
  siteLink: async () => {
    const j: any = await post('site-link');
    const url = j?.url ?? j?.link ?? j?.data?.url;
    return typeof url === 'string' ? url : null;
  },

  registerDevice: (token: string, piattaforma: string, lingua: string) => post('devices', { token, piattaforma, lingua }),
  deleteAccount: () => post('account/delete'),
};
