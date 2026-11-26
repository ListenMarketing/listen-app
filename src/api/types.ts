/**
 * Forme «normalizzate» usate dalle schermate. Le risposte delle API del Blocco 125
 * passano tutte da `normalize.ts`, che è l'unico punto dove si leggono i nomi dei
 * campi del server (vedi docs/API-CONTRACT.md).
 */

export type Role = 'artista' | 'producer' | 'studio' | 'pubblico';

export type Phase =
  | 'preparazione'
  | 'consegna_beat'
  | 'cuori_beat'
  | 'top10'
  | 'iscrizioni'
  | 'sessioni'
  | 'consegna_brani'
  | 'cuori_brani'
  | 'classifiche'
  | 'finale'
  | 'chiusa';

export const PHASES: Phase[] = [
  'preparazione',
  'consegna_beat',
  'cuori_beat',
  'top10',
  'iscrizioni',
  'sessioni',
  'consegna_brani',
  'cuori_brani',
  'classifiche',
  'finale',
  'chiusa',
];

/** Testo che può arrivare come stringa o come { it, en }. */
export type ServerText = string | null;

export type Permissions = {
  uploadBeat: boolean;
  giveHearts: boolean;
  bookSlot: boolean;
  checkout: boolean;
  redeem: boolean;
  uploadTrack: boolean;
  changeRegion: boolean;
};

export type AppState = {
  phase: Phase;
  editionName: string | null;
  /** quando finisce la fase corrente / comincia la prossima (per il countdown) */
  nextPhaseAt: string | null;
  nextPhase: Phase | null;
  dates: Partial<Record<Phase, { start: string | null; end: string | null }>>;
  can: Permissions;
  heartsAvailable: number | null;
  heartsTotal: number | null;
  minVersion: string | null;
  storeUrl: { ios: string | null; android: string | null };
  playlist: { name: string | null; url: string | null; subtitle: string | null };
  counts: { beats: number | null; tracks: number | null };
  limits: { beatMaxSeconds: number | null; beatMaxBytes: number | null };
  votableRegions: string[];
  finale: { title: ServerText; text: ServerText; prize: ServerText; prizeVisible: boolean };
  links: { rules: string | null; privacy: string | null; terms: string | null };
};

export type Me = {
  id: string | null;
  name: string | null;
  email: string | null;
  emailVerified: boolean | null;
  role: Role | null;
  /** studio in attesa dell'approvazione di Listen */
  pendingApproval: boolean;
  region: string | null;
  city: string | null;
  phone: string | null;
  instagram: string | null;
  artistSince: string | null;
  playlistOpenedAt: string | null;
  playlistConfirmedAt: string | null;
  /** candidatura producer (schermata 02) */
  producer: { stageName: string | null; city: string | null; instagram: string | null; genre: string | null } | null;
  hasEntry: boolean;
  /** codice già attivo perché l'acquisto è stato fatto con questo account */
  activeCode: string | null;
  notificationsConsent: boolean | null;
};

export type BeatStatus = 'caricato' | 'in_gara' | 'top10' | 'escluso' | string;

export type Beat = {
  id: string;
  title: string;
  producerName: string | null;
  genre: string | null;
  bpm: number | null;
  previewUrl: string | null;
  hearts: number | null;
  mine: boolean;
  hearted: boolean;
  status: BeatStatus | null;
  excludedReason: ServerText;
  position: number | null;
  fileName: string | null;
};

export type BeatList = {
  items: Beat[];
  genres: { name: string; count: number | null }[];
  total: number | null;
  heartsAvailable: number | null;
  heartsTotal: number | null;
  /** messaggio del server per il producer che non è tra i 10, senza posizione */
  note: ServerText;
};

export type UploadTarget = {
  url: string;
  method: 'PUT' | 'POST';
  headers: Record<string, string>;
  /** percorso o token da rimandare al server alla conferma */
  path: string | null;
};

export type RegionSeats = {
  name: string;
  capacity: number | null;
  enrolled: number | null;
  free: number | null;
  full: boolean;
  waitlistText: ServerText;
};

export type Package = { id: 'base' | 'completo' | string; name: string; price: string | null; includes: string[] };

export type Regions = {
  items: RegionSeats[];
  totalCapacity: number | null;
  totalEnrolled: number | null;
  waitlistText: ServerText;
  packages: Package[];
};

export type Interest = {
  stageName: string;
  region: string;
  city: string;
  phone: string;
  instagram: string;
  email: string;
  genre: string;
  wantsToJoin: boolean;
  updatesConsent: boolean;
};

export type Studio = { id: string; name: string; city: string | null; region: string | null };

export type ExternalStudio = { name: string; address: string; instagram: string; phone: string; email: string };

export type EntryStatus =
  | 'iscritto'
  | 'lista_attesa'
  | 'da_contattare'
  | 'session_prenotata'
  | 'session_fatta'
  | 'consegna_studio'
  | 'brano_caricato'
  | 'controllato'
  | 'online'
  | 'in_gara'
  | 'passato'
  | 'wildcard'
  | 'escluso'
  | 'annullato'
  | string;

export type Entry = {
  status: EntryStatus;
  statusText: ServerText;
  packageId: string | null;
  packageName: string | null;
  region: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  artistSince: string | null;
  studio: { name: string | null; city: string | null; phone: string | null; partner: boolean } | null;
  sessionAt: string | null;
  sessionEndsAt: string | null;
  studioDeliveredAt: string | null;
  trackDueAt: string | null;
  beat: Beat | null;
  canChooseBeat: boolean;
  canUploadTrack: boolean;
  spotifyUrl: string | null;
};

export type TrackData = {
  title: string;
  artistName: string;
  spotifyProfileUrl: string;
  genre: string;
  language: string;
  explicit: boolean;
  lyricsAuthor: string;
  producer: string;
  lyrics: string;
  declarations: { mine: boolean; notOffensive: boolean; distribution: boolean };
};

export type TrackStatus = {
  submitted: boolean;
  status: string | null;
  statusText: ServerText;
  data: Partial<TrackData>;
  wavName: string | null;
  hasCover: boolean;
  spotifyUrl: string | null;
  dueAt: string | null;
};

export type ContestTrack = {
  id: string;
  title: string;
  artistName: string | null;
  genre: string | null;
  beatLabel: string | null;
  previewUrl: string | null;
  spotifyUrl: string | null;
  hearts: number | null;
  hearted: boolean;
  mine: boolean;
};

export type TrackList = {
  region: string | null;
  items: ContestTrack[];
  total: number | null;
  heartsAvailable: number | null;
  heartsTotal: number | null;
  votableRegions: string[];
};

export type RankingRow = { id: string; artistName: string | null; title: string | null; detail: string | null; previewUrl: string | null; spotifyUrl: string | null };

export type Ranking = {
  region: string | null;
  published: boolean;
  passed: RankingRow[];
  wildcards: RankingRow[];
  intro: ServerText;
  wildcardText: ServerText;
};

export type MarketingCard = { title: string; text: string; url: string | null };
export type Marketing = { title: ServerText; intro: ServerText; cards: MarketingCard[]; siteUrl: string | null; publicNote: ServerText };

export type HeartResult = { available: number | null; count: number | null; given: boolean | null };
