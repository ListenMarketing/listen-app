/**
 * Controlli fatti PRIMA dell'invio. Il server li rifà sempre: questi servono
 * solo a non far aspettare un caricamento che verrebbe comunque rifiutato.
 */

export type FileCheck = { ok: true } | { ok: false; reason: BeatFileError | CoverError | TrackFileError };

export type BeatFileError = 'format' | 'size' | 'duration';
export type CoverError = 'cover_format' | 'cover_size';
export type TrackFileError = 'wav_format';

export type BeatLimits = { maxSeconds: number; maxBytes: number };
export const DEFAULT_BEAT_LIMITS: BeatLimits = { maxSeconds: 30, maxBytes: 25 * 1024 * 1024 };

const ext = (name: string | null | undefined) => (name ?? '').toLowerCase().split('.').pop() ?? '';

const AUDIO_MIME = ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave', 'audio/mpeg', 'audio/mp3'];

export function isBeatFormat(name?: string | null, mime?: string | null): boolean {
  const e = ext(name);
  if (e === 'wav' || e === 'mp3') return true;
  return !!mime && AUDIO_MIME.includes(mime.toLowerCase());
}

/**
 * Beat: WAV o MP3, al massimo 30 secondi e 25 MB (i limiti arrivano da `state` se il server li manda).
 * Una piccola tolleranza (0,5 s) copre gli arrotondamenti dei metadati: decide comunque il server.
 */
export function validateBeatFile(
  file: { name?: string | null; mimeType?: string | null; size?: number | null; durationSeconds?: number | null },
  limits: BeatLimits = DEFAULT_BEAT_LIMITS,
): FileCheck {
  if (!isBeatFormat(file.name, file.mimeType)) return { ok: false, reason: 'format' };
  if (file.size != null && file.size > limits.maxBytes) return { ok: false, reason: 'size' };
  if (file.durationSeconds != null && file.durationSeconds > limits.maxSeconds + 0.5) {
    return { ok: false, reason: 'duration' };
  }
  return { ok: true };
}

export function validateWav(file: { name?: string | null; mimeType?: string | null }): FileCheck {
  const e = ext(file.name);
  const m = (file.mimeType ?? '').toLowerCase();
  if (e === 'wav' || m.includes('wav')) return { ok: true };
  return { ok: false, reason: 'wav_format' };
}

export const COVER_SIDE = 3000;

/** Copertina: JPG o PNG, esattamente 3000×3000. */
export function validateCover(img: { width?: number | null; height?: number | null; mimeType?: string | null; name?: string | null }): FileCheck {
  const e = ext(img.name);
  const m = (img.mimeType ?? '').toLowerCase();
  const formatOk = ['jpg', 'jpeg', 'png'].includes(e) || m === 'image/jpeg' || m === 'image/png';
  if (!formatOk) return { ok: false, reason: 'cover_format' };
  if (img.width !== COVER_SIDE || img.height !== COVER_SIDE) return { ok: false, reason: 'cover_size' };
  return { ok: true };
}

export function mimeFor(name: string | null | undefined, fallback?: string | null): string {
  switch (ext(name)) {
    case 'wav':
      return 'audio/wav';
    case 'mp3':
      return 'audio/mpeg';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return fallback || 'application/octet-stream';
  }
}
