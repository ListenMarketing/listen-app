/** Funzioni pure di formattazione: niente regole del contest qui dentro. */

/** Alfabeto del codice di iscrizione: senza 0, O, 1, I. */
const CODE_ALPHABET = /[^A-HJ-NP-Z2-9]/g;
const CODE_GROUPS = [4, 4, 4, 4, 2];
export const CODE_LENGTH = 18;

/** Toglie tutto ciò che non può stare in un codice e lo porta in maiuscolo (max 18 caratteri). */
export function cleanCode(input: string): string {
  return input.toUpperCase().replace(CODE_ALPHABET, '').slice(0, CODE_LENGTH);
}

/** LM27K7Q49XTR2BHVM8 → LM27-K7Q4-9XTR-2BHV-M8, anche mentre si scrive. */
export function formatCode(input: string): string {
  const clean = cleanCode(input);
  const parts: string[] = [];
  let i = 0;
  for (const len of CODE_GROUPS) {
    if (i >= clean.length) break;
    parts.push(clean.slice(i, i + len));
    i += len;
  }
  return parts.join('-');
}

export function isCompleteCode(input: string): boolean {
  return cleanCode(input).length === CODE_LENGTH;
}

export type CountdownParts = { days: number; hours: number; minutes: number; seconds: number; done: boolean };

export function countdownParts(target: string | number | Date | null | undefined, now = Date.now()): CountdownParts | null {
  if (target == null) return null;
  const t = new Date(target).getTime();
  if (Number.isNaN(t)) return null;
  const diff = Math.max(0, t - now);
  const s = Math.floor(diff / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
    done: diff === 0,
  };
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Confronto di versioni «1.2.3»: >0 se a è più alta di b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

export function needsUpdate(installed: string, minimum: string | null | undefined): boolean {
  if (!minimum) return false;
  return compareVersions(minimum, installed) > 0;
}

export function formatDateTime(value: string | number | null | undefined, lang: string): string {
  if (value == null) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }
}

export function formatTime(value: string | number | null | undefined, lang: string): string {
  if (value == null) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes && bytes !== 0) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1).replace('.', ',')} MB`;
}

export function formatSeconds(s: number | null | undefined): string {
  if (s == null || Number.isNaN(s)) return '';
  const t = Math.round(s);
  return `${Math.floor(t / 60)}:${pad2(t % 60)}`;
}

/** Tempo che resta in parole semplici, per il blocco dell'inserimento del codice. */
export function formatRemaining(seconds: number, lang: string): string {
  const m = Math.ceil(seconds / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    return lang.startsWith('it') ? `${h} h ${r} min` : `${h}h ${r}m`;
  }
  return `${m} min`;
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '··';
  const a = parts[0][0] ?? '';
  const b = parts.length > 1 ? parts[1][0] : (parts[0][1] ?? '');
  return (a + b).toUpperCase();
}

export function normalizeInstagram(v: string): string {
  const t = v.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?].*$/, '').replace(/^@+/, '');
  return t ? `@${t}` : '';
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
