import type {
  AppState, Beat, BeatList, ContestTrack, Entry, HeartResult, Interest, Marketing, Me, Phase, Ranking, RankingRow,
  Regions, RegionSeats, Role, ServerText, Studio, TrackList, TrackStatus, UploadTarget, Package,
} from './types';
import { PHASES } from './types';

/**
 * UNICO punto in cui si leggono i nomi dei campi delle API /api/app/v1.
 * I nomi principali sono quelli scritti nel Blocco 125 (in italiano, snake_case);
 * accanto a ognuno si accettano poche varianti ovvie, così un dettaglio diverso
 * nel server non rompe l'app. Se un campo manca, l'app mostra meno: non inventa.
 */

type Obj = Record<string, any>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);

let currentLang = 'it';
export const setApiLanguage = (lang: string) => {
  currentLang = lang.startsWith('en') ? 'en' : 'it';
};
export const getApiLanguage = () => currentLang;

function pick(o: unknown, ...keys: string[]): any {
  if (!isObj(o)) return undefined;
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return undefined;
}

/** Stringa o { it, en } → stringa nella lingua dell'app. */
export function text(v: unknown): ServerText {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  if (isObj(v)) {
    const t = v[currentLang] ?? v.it ?? v.en;
    return typeof t === 'string' && t.trim() ? t : null;
  }
  return null;
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : typeof v === 'number' ? String(v) : null);
const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
};
const bool = (v: unknown): boolean => v === true || v === 1 || v === 'true';
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);
const body = (j: unknown, ...keys: string[]): Obj => {
  const inner = pick(j, ...keys, 'data');
  return isObj(inner) ? inner : isObj(j) ? j : {};
};
const list = (j: unknown, ...keys: string[]): any[] => {
  if (Array.isArray(j)) return j;
  const direct = pick(j, ...keys, 'items', 'data');
  if (Array.isArray(direct)) return direct;
  if (isObj(direct)) return list(direct, ...keys);
  return [];
};

export function normalizeRole(v: unknown): Role | null {
  switch (String(v ?? '').toLowerCase()) {
    case 'artista':
    case 'artist':
    case 'emergente':
    case 'emerging':
      return 'artista';
    case 'producer':
      return 'producer';
    case 'studio':
    case 'agency':
    case 'agenzia':
    case 'studio_di_produzione':
      return 'studio';
    case 'pubblico':
    case 'public':
      return 'pubblico';
    default:
      return null;
  }
}

const normalizePhase = (v: unknown): Phase | null => {
  const p = String(v ?? '').toLowerCase() as Phase;
  return PHASES.includes(p) ? p : null;
};

export function normalizeState(j: unknown): AppState {
  const o = body(j, 'state', 'stato');
  const ed = isObj(pick(o, 'edizione', 'edition')) ? pick(o, 'edizione', 'edition') : {};
  const perm = isObj(pick(o, 'permessi', 'permissions')) ? pick(o, 'permessi', 'permissions') : o;
  const phase = normalizePhase(pick(o, 'fase', 'fase_corrente', 'phase') ?? pick(ed, 'fase', 'fase_corrente')) ?? 'preparazione';

  const rawDates = pick(o, 'date', 'dates', 'fasi') ?? pick(ed, 'date', 'fasi');
  const dates: AppState['dates'] = {};
  if (isObj(rawDates)) {
    for (const p of PHASES) {
      const d = rawDates[p];
      if (isObj(d)) dates[p] = { start: str(pick(d, 'inizio', 'start', 'dal')), end: str(pick(d, 'fine', 'end', 'al')) };
      else if (typeof d === 'string') dates[p] = { start: d, end: null };
    }
  } else if (Array.isArray(rawDates)) {
    for (const d of rawDates) {
      const p = normalizePhase(pick(d, 'fase', 'phase'));
      if (p) dates[p] = { start: str(pick(d, 'inizio', 'start')), end: str(pick(d, 'fine', 'end')) };
    }
  }

  const idx = PHASES.indexOf(phase);
  const following = idx >= 0 && idx < PHASES.length - 1 ? PHASES[idx + 1] : null;
  const nextPhase = normalizePhase(pick(o, 'prossima_fase', 'next_phase')) ?? following;
  const nextPhaseAt =
    str(pick(o, 'prossima_fase_at', 'prossima_fase_il', 'fine_fase', 'fase_fine', 'next_phase_at')) ??
    dates[phase]?.end ??
    (nextPhase ? (dates[nextPhase]?.start ?? null) : null);

  const pl = isObj(pick(o, 'playlist')) ? o.playlist : {};
  const store = isObj(pick(o, 'store', 'store_url')) ? pick(o, 'store', 'store_url') : {};
  const lim = isObj(pick(o, 'limiti', 'limits')) ? pick(o, 'limiti', 'limits') : {};
  const fin = isObj(pick(o, 'finale')) ? o.finale : {};
  const links = isObj(pick(o, 'link', 'links')) ? pick(o, 'link', 'links') : {};
  const maxMb = num(pick(lim, 'beat_max_mb'));
  const prize = text(pick(fin, 'premio', 'premio_testo') ?? pick(o, 'premio', 'premio_testo'));

  return {
    phase,
    editionName: str(pick(ed, 'nome', 'name') ?? pick(o, 'edizione_nome')),
    nextPhaseAt,
    nextPhase,
    dates,
    can: {
      uploadBeat: bool(pick(perm, 'puo_caricare_beat')),
      giveHearts: bool(pick(perm, 'puo_dare_cuori')),
      bookSlot: bool(pick(perm, 'puo_prenotare_slot')),
      checkout: bool(pick(perm, 'puo_acquistare', 'puo_pagare', 'puo_iscriversi')),
      redeem: bool(pick(perm, 'puo_inserire_codice', 'puo_riscattare_codice')),
      uploadTrack: bool(pick(perm, 'puo_caricare_brano')),
      changeRegion: bool(pick(perm, 'puo_cambiare_regione', 'voto_piu_regioni')),
    },
    heartsAvailable: num(pick(o, 'cuori_disponibili') ?? pick(perm, 'cuori_disponibili')),
    heartsTotal: num(pick(o, 'cuori_totali') ?? pick(perm, 'cuori_totali')),
    minVersion: str(pick(o, 'versione_minima', 'versione_minima_app', 'min_version')),
    storeUrl: {
      ios: str(pick(store, 'ios') ?? pick(o, 'store_url_ios')),
      android: str(pick(store, 'android') ?? pick(o, 'store_url_android')),
    },
    playlist: {
      name: str(pick(pl, 'nome', 'name') ?? pick(o, 'playlist_nome')),
      url: str(pick(pl, 'url', 'link') ?? pick(o, 'playlist_url') ?? pick(ed, 'playlist_url')),
      subtitle: text(pick(pl, 'descrizione', 'sottotitolo')),
    },
    counts: {
      beats: num(pick(o, 'beat_consegnati', 'beat_in_gara', 'totale_beat')),
      tracks: num(pick(o, 'brani_consegnati', 'brani_in_gara', 'totale_brani')),
    },
    limits: {
      beatMaxSeconds: num(pick(lim, 'beat_max_secondi', 'beat_durata_max')),
      beatMaxBytes: num(pick(lim, 'beat_max_bytes')) ?? (maxMb != null ? maxMb * 1024 * 1024 : null),
    },
    votableRegions: arr(pick(o, 'regioni_votabili') ?? pick(perm, 'regioni_votabili')).map(String),
    finale: {
      title: text(pick(fin, 'titolo')),
      text: text(pick(fin, 'testo', 'descrizione')),
      prize,
      prizeVisible: pick(fin, 'premio_visibile') !== undefined ? bool(pick(fin, 'premio_visibile')) : !!prize,
    },
    links: {
      rules: str(pick(links, 'regolamento') ?? pick(o, 'regolamento_url')),
      privacy: str(pick(links, 'privacy') ?? pick(o, 'privacy_url')),
      terms: str(pick(links, 'termini') ?? pick(o, 'termini_url')),
    },
  };
}

export function normalizeMe(j: unknown): Me {
  const root = body(j, 'me');
  const o = isObj(pick(root, 'profilo', 'profile')) ? { ...root, ...pick(root, 'profilo', 'profile') } : root;
  const pl = isObj(pick(o, 'playlist')) ? o.playlist : {};
  const entry = pick(root, 'iscrizione', 'entry');
  const code = pick(root, 'codice_attivo', 'codice') ?? pick(o, 'codice_attivo');
  const prod = pick(o, 'producer', 'candidatura');
  const stato = String(pick(o, 'stato', 'stato_verifica', 'status') ?? '').toLowerCase();
  const approved = pick(o, 'approvato', 'approved', 'verificato');
  const verified = pick(o, 'email_verificata', 'email_verified', 'email_confirmed_at');
  return {
    id: str(pick(o, 'id', 'profile_id')),
    name: str(pick(o, 'nome', 'nome_arte', 'name', 'display_name')),
    email: str(pick(o, 'email')),
    emailVerified: verified === undefined ? null : !!verified,
    role: normalizeRole(pick(o, 'ruolo', 'ruolo_app', 'role')),
    pendingApproval:
      bool(pick(o, 'in_verifica')) || stato === 'in_verifica' || stato === 'pending' || approved === false,
    region: str(pick(o, 'regione')),
    city: str(pick(o, 'citta', 'città')),
    phone: str(pick(o, 'telefono')),
    instagram: str(pick(o, 'instagram')),
    artistSince: str(pick(o, 'da_quando_artista')),
    playlistOpenedAt: str(pick(o, 'playlist_opened_at') ?? pick(pl, 'opened_at', 'aperta_il', 'aperta')),
    playlistConfirmedAt: str(pick(o, 'playlist_confirmed_at') ?? pick(pl, 'confirmed_at', 'confermata_il', 'confermata')),
    producer: isObj(prod)
      ? {
          stageName: str(pick(prod, 'nome_arte', 'nome')),
          city: str(pick(prod, 'citta', 'città')),
          instagram: str(pick(prod, 'instagram')),
          genre: str(pick(prod, 'genere')),
        }
      : null,
    hasEntry: isObj(entry) || bool(pick(o, 'iscritto', 'ha_iscrizione')),
    activeCode: typeof code === 'string' ? code : str(pick(code, 'codice', 'code')),
    notificationsConsent: pick(o, 'consenso_notifiche') === undefined ? null : bool(pick(o, 'consenso_notifiche')),
  };
}

export function normalizeBeat(b: unknown): Beat {
  const prod = pick(b, 'producer');
  return {
    id: String(pick(b, 'id', 'beat_id') ?? ''),
    title: str(pick(b, 'titolo', 'title')) ?? '',
    producerName: isObj(prod) ? str(pick(prod, 'nome_arte', 'nome')) : str(prod) ?? str(pick(b, 'producer_nome', 'nome_arte')),
    genre: str(pick(b, 'genere')),
    bpm: num(pick(b, 'bpm')),
    previewUrl: str(pick(b, 'anteprima_url', 'preview_url', 'anteprima')),
    hearts: num(pick(b, 'cuori', 'cuori_semplici')),
    mine: bool(pick(b, 'mio', 'mine')),
    hearted: bool(pick(b, 'mio_cuore', 'cuore_dato', 'hearted')),
    status: str(pick(b, 'stato')),
    excludedReason: text(pick(b, 'motivo', 'motivo_esclusione')),
    position: null, // le posizioni non si mostrano: l'ordine è quello della lista pubblicata
    fileName: str(pick(b, 'file_nome', 'file_name', 'nome_file')),
  };
}

export function normalizeBeatList(j: unknown): BeatList {
  const o = isObj(j) ? j : {};
  const genres = arr(pick(o, 'generi')).map((g) =>
    typeof g === 'string' ? { name: g, count: null } : { name: str(pick(g, 'nome', 'genere')) ?? '', count: num(pick(g, 'conteggio', 'totale', 'count')) },
  );
  return {
    items: list(j, 'beats', 'beat').map(normalizeBeat).filter((b) => b.id),
    genres: genres.filter((g) => g.name),
    total: num(pick(o, 'totale', 'in_gara', 'total')),
    heartsAvailable: num(pick(o, 'cuori_disponibili')),
    heartsTotal: num(pick(o, 'cuori_totali')),
    note: text(pick(o, 'messaggio', 'nota')),
  };
}

export function normalizeMyBeat(j: unknown): Beat | null {
  const o = pick(j, 'beat', 'data');
  const b = isObj(o) ? o : isObj(j) && pick(j, 'id', 'titolo') ? j : null;
  return b ? { ...normalizeBeat(b), mine: true } : null;
}

export function normalizeUploadTarget(j: unknown): UploadTarget | null {
  const o = isObj(pick(j, 'upload', 'caricamento')) ? pick(j, 'upload', 'caricamento') : j;
  const url = str(pick(o, 'upload_url', 'signed_url', 'url'));
  if (!url) return null;
  const method = String(pick(o, 'metodo', 'method') ?? 'PUT').toUpperCase() === 'POST' ? 'POST' : 'PUT';
  const headers = isObj(pick(o, 'headers', 'intestazioni')) ? (pick(o, 'headers', 'intestazioni') as Record<string, string>) : {};
  return { url, method, headers, path: str(pick(o, 'path', 'percorso', 'token', 'file_path')) };
}

export function normalizeHeart(j: unknown): HeartResult {
  const given = pick(j, 'cuore_dato', 'mio_cuore', 'given');
  return {
    available: num(pick(j, 'cuori_disponibili', 'cuori_restanti', 'restano')),
    count: num(pick(j, 'cuori', 'conteggio')),
    given: given === undefined ? null : bool(given),
  };
}

function normalizeRegion(r: unknown, fallbackText: ServerText): RegionSeats {
  const capacity = num(pick(r, 'capienza', 'posti'));
  const enrolled = num(pick(r, 'iscritti'));
  const freeRaw = num(pick(r, 'posti_liberi', 'liberi'));
  const free = freeRaw ?? (capacity != null && enrolled != null ? Math.max(0, capacity - enrolled) : null);
  const fullRaw = pick(r, 'piena', 'full');
  return {
    name: str(pick(r, 'regione', 'nome')) ?? '',
    capacity,
    enrolled,
    free,
    full: fullRaw !== undefined ? bool(fullRaw) : free === 0,
    waitlistText: text(pick(r, 'messaggio_lista_attesa', 'lista_attesa_testo', 'messaggio')) ?? fallbackText,
  };
}

function normalizePackage(p: unknown): Package {
  const price = pick(p, 'prezzo_testo', 'prezzo', 'price');
  return {
    id: String(pick(p, 'id', 'pacchetto', 'codice') ?? '').toLowerCase(),
    name: str(pick(p, 'nome', 'titolo')) ?? '',
    price: typeof price === 'number' ? `${price} €` : str(price),
    includes: arr(pick(p, 'comprende', 'include', 'voci')).map((x) => text(x)).filter((x): x is string => !!x),
  };
}

export function normalizeRegions(j: unknown): Regions {
  const o = isObj(j) ? j : {};
  const waitlistText = text(pick(o, 'messaggio_lista_attesa', 'lista_attesa_testo', 'testo_lista_attesa'));
  const items = list(j, 'regioni', 'regions').map((r) => normalizeRegion(r, waitlistText)).filter((r) => r.name);
  const sum = (f: (r: RegionSeats) => number | null) => (items.length && items.every((r) => f(r) != null) ? items.reduce((a, r) => a + (f(r) ?? 0), 0) : null);
  return {
    items,
    totalCapacity: num(pick(o, 'capienza_totale', 'posti_totali')) ?? sum((r) => r.capacity),
    totalEnrolled: num(pick(o, 'iscritti_totali')) ?? sum((r) => r.enrolled),
    waitlistText,
    packages: arr(pick(o, 'pacchetti', 'packages')).map(normalizePackage).filter((p) => p.id),
  };
}

export function normalizeInterest(j: unknown): Interest | null {
  const o = pick(j, 'prenotazione', 'interest', 'data');
  const i = isObj(o) ? o : isObj(j) && pick(j, 'regione') ? j : null;
  if (!i) return null;
  return {
    stageName: str(pick(i, 'nome_arte')) ?? '',
    region: str(pick(i, 'regione')) ?? '',
    city: str(pick(i, 'citta', 'città')) ?? '',
    phone: str(pick(i, 'telefono')) ?? '',
    instagram: str(pick(i, 'instagram')) ?? '',
    email: str(pick(i, 'email')) ?? '',
    genre: str(pick(i, 'genere')) ?? '',
    wantsToJoin: pick(i, 'vuole_partecipare') === undefined ? true : bool(pick(i, 'vuole_partecipare')),
    updatesConsent: bool(pick(i, 'consenso_aggiornamenti')),
  };
}

export function normalizeStudios(j: unknown): Studio[] {
  return list(j, 'studi', 'studi_partner', 'studios')
    .map((s) => ({
      id: String(pick(s, 'id') ?? ''),
      name: str(pick(s, 'nome', 'name')) ?? '',
      city: str(pick(s, 'citta', 'città')),
      region: str(pick(s, 'regione')),
    }))
    .filter((s) => s.id && s.name);
}

export function normalizeEntry(j: unknown): Entry | null {
  const o = pick(j, 'iscrizione', 'entry', 'data');
  const e = isObj(o) ? o : isObj(j) && pick(j, 'stato', 'pacchetto') ? j : null;
  if (!e) return null;
  const studioP = pick(e, 'studio', 'studio_partner');
  const studioE = pick(e, 'studio_esterno');
  const st = isObj(studioP) ? studioP : isObj(studioE) ? studioE : null;
  const beat = pick(e, 'beat');
  const pkg = pick(e, 'pacchetto');
  const perm = isObj(pick(e, 'permessi')) ? e.permessi : e;
  return {
    status: String(pick(e, 'stato') ?? 'iscritto'),
    statusText: text(pick(e, 'stato_testo', 'stato_messaggio')),
    packageId: isObj(pkg) ? str(pick(pkg, 'id')) : str(pkg),
    packageName: isObj(pkg) ? str(pick(pkg, 'nome')) : str(pick(e, 'pacchetto_nome')),
    region: str(pick(e, 'regione')),
    city: str(pick(e, 'citta', 'città')),
    phone: str(pick(e, 'telefono')),
    email: str(pick(e, 'email')),
    instagram: str(pick(e, 'instagram')),
    artistSince: str(pick(e, 'da_quando_artista')),
    studio: st
      ? { name: str(pick(st, 'nome', 'name')), city: str(pick(st, 'citta', 'città')), phone: str(pick(st, 'telefono')), partner: isObj(studioP) }
      : null,
    sessionAt: str(pick(e, 'session_at', 'session_il')),
    sessionEndsAt: str(pick(e, 'session_fine_at', 'session_fine')),
    studioDeliveredAt: str(pick(e, 'consegna_studio_at')),
    trackDueAt: str(pick(e, 'consegna_entro', 'scadenza_brano')),
    beat: isObj(beat) ? normalizeBeat(beat) : null,
    canChooseBeat: bool(pick(perm, 'puo_scegliere_beat', 'puo_cambiare_beat')),
    canUploadTrack: bool(pick(perm, 'puo_caricare_brano')),
    spotifyUrl: str(pick(e, 'spotify_url', 'link_spotify')),
  };
}

export function normalizeTrackStatus(j: unknown): TrackStatus {
  const o = pick(j, 'brano', 'track', 'data');
  const t: Obj = isObj(o) ? o : isObj(j) ? j : {};
  const d: Obj = isObj(pick(t, 'dati')) ? t.dati : t;
  const stato = str(pick(t, 'stato'));
  const dich = isObj(pick(d, 'dichiarazioni')) ? d.dichiarazioni : {};
  const explicit = pick(d, 'esplicito');
  return {
    submitted: pick(t, 'inviato') !== undefined ? bool(pick(t, 'inviato')) : !!stato && stato !== 'bozza',
    status: stato,
    statusText: text(pick(t, 'stato_testo', 'stato_messaggio')),
    data: {
      title: str(pick(d, 'titolo')) ?? undefined,
      artistName: str(pick(d, 'nome_artista')) ?? undefined,
      spotifyProfileUrl: str(pick(d, 'spotify_profilo', 'link_spotify_profilo')) ?? undefined,
      genre: str(pick(d, 'genere')) ?? undefined,
      language: str(pick(d, 'lingua')) ?? undefined,
      explicit: explicit === undefined ? undefined : bool(explicit),
      lyricsAuthor: str(pick(d, 'autore_testo')) ?? undefined,
      producer: str(pick(d, 'producer')) ?? undefined,
      lyrics: str(pick(d, 'testo')) ?? undefined,
      declarations: Object.keys(dich).length
        ? { mine: bool(pick(dich, 'brano_mio')), notOffensive: bool(pick(dich, 'testo_non_offende')), distribution: bool(pick(dich, 'autorizzo_distribuzione')) }
        : undefined,
    },
    wavName: str(pick(t, 'wav_nome', 'file_nome')),
    hasCover: bool(pick(t, 'copertina', 'ha_copertina')) || !!str(pick(t, 'copertina_url')),
    spotifyUrl: str(pick(t, 'spotify_url', 'link_spotify')),
    dueAt: str(pick(t, 'consegna_entro', 'scadenza')),
  };
}

function normalizeTrack(t: unknown): ContestTrack {
  const beat = pick(t, 'beat');
  return {
    id: String(pick(t, 'id', 'brano_id') ?? ''),
    title: str(pick(t, 'titolo')) ?? '',
    artistName: str(pick(t, 'nome_arte', 'nome_artista', 'artista')),
    genre: str(pick(t, 'genere')),
    beatLabel: isObj(beat) ? str(pick(beat, 'titolo')) : str(beat) ?? str(pick(t, 'beat_titolo')),
    previewUrl: str(pick(t, 'anteprima_url', 'preview_url', 'anteprima')),
    spotifyUrl: str(pick(t, 'spotify_url', 'link_spotify')),
    hearts: num(pick(t, 'cuori', 'cuori_semplici')),
    hearted: bool(pick(t, 'mio_cuore', 'cuore_dato')),
    mine: bool(pick(t, 'mio')),
  };
}

export function normalizeTrackList(j: unknown): TrackList {
  const o = isObj(j) ? j : {};
  return {
    region: str(pick(o, 'regione')),
    items: list(j, 'brani', 'tracks').map(normalizeTrack).filter((t) => t.id),
    total: num(pick(o, 'totale')),
    heartsAvailable: num(pick(o, 'cuori_disponibili')),
    heartsTotal: num(pick(o, 'cuori_totali')),
    votableRegions: arr(pick(o, 'regioni_votabili')).map(String),
  };
}

/** Solo nomi e titoli, come pubblicati: mai punteggi, pesi o posizioni calcolate dall'app. */
function normalizeRankingRow(r: unknown): RankingRow {
  return {
    id: String(pick(r, 'id', 'brano_id', 'target_id') ?? ''),
    artistName: str(pick(r, 'nome_arte', 'nome_artista', 'artista')),
    title: str(pick(r, 'titolo')),
    detail: str(pick(r, 'genere')),
    previewUrl: str(pick(r, 'anteprima_url', 'preview_url')),
    spotifyUrl: str(pick(r, 'spotify_url', 'link_spotify')),
  };
}

export function normalizeRanking(j: unknown): Ranking {
  const o = isObj(j) ? j : {};
  const pub = pick(o, 'pubblicata', 'pubblicate', 'published');
  const passed = arr(pick(o, 'passati')).map(normalizeRankingRow);
  const wildcards = arr(pick(o, 'wildcard', 'wild_card')).map(normalizeRankingRow);
  return {
    region: str(pick(o, 'regione')),
    published: pub !== undefined ? bool(pub) : passed.length + wildcards.length > 0,
    passed,
    wildcards,
    intro: text(pick(o, 'testo', 'intro')),
    wildcardText: text(pick(o, 'wildcard_testo', 'testo_wildcard')),
  };
}

export function normalizeMarketing(j: unknown): Marketing {
  const o = body(j, 'marketing');
  return {
    title: text(pick(o, 'titolo')),
    intro: text(pick(o, 'testo', 'intro', 'sottotitolo')),
    cards: arr(pick(o, 'schede', 'cards'))
      .map((c) => ({ title: text(pick(c, 'titolo')) ?? '', text: text(pick(c, 'testo', 'descrizione')) ?? '', url: str(pick(c, 'url', 'link')) }))
      .filter((c) => c.title),
    siteUrl: str(pick(o, 'url_sito', 'sito_url', 'url')),
    publicNote: text(pick(o, 'nota_pubblico', 'testo_pubblico')),
  };
}

/** Messaggio d'errore del server, nella lingua dell'app. */
export function serverMessage(j: unknown): string | null {
  if (typeof j === 'string') return j.trim() || null;
  if (!isObj(j)) return null;
  const byLang = j[`message_${currentLang}`] ?? j[`messaggio_${currentLang}`];
  if (typeof byLang === 'string' && byLang.trim()) return byLang;
  for (const c of [j.message, j.messaggio, j.error, j.errore]) {
    if (isObj(c)) {
      const nested = text(c) ?? text(c.message) ?? text(c.messaggio);
      if (nested) return nested;
    } else {
      const t = text(c);
      if (t) return t;
    }
  }
  return null;
}

export const errorCode = (j: unknown): string | null => {
  if (!isObj(j)) return null;
  const e = j.error;
  return str(j.code) ?? str(j.codice_errore) ?? (isObj(e) ? str(e.code) : null);
};

export const retryAfterSeconds = (j: unknown): number | null => {
  const direct = num(pick(j, 'retry_after', 'riprova_tra_secondi', 'secondi_rimanenti', 'tempo_rimanente'));
  if (direct != null) return direct;
  const until = str(pick(j, 'bloccato_fino_a', 'blocked_until'));
  if (until) {
    const s = Math.ceil((new Date(until).getTime() - Date.now()) / 1000);
    return Number.isFinite(s) && s > 0 ? s : null;
  }
  return null;
};
