import { Platform } from 'react-native';
import { apiBase, env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { errorCode, getApiLanguage, retryAfterSeconds, serverMessage } from './normalize';

/**
 * Client delle API del sito (/api/app/v1): JWT di Supabase Auth nell'intestazione
 * Authorization, risposte JSON. In caso di errore si mostra il messaggio del server.
 */
export class ApiError extends Error {
  status: number;
  code: string | null;
  retryAfter: number | null;
  /** true quando il messaggio arriva dal server (e va mostrato così com'è) */
  fromServer: boolean;
  network: boolean;

  constructor(opts: { message: string; status: number; code?: string | null; retryAfter?: number | null; fromServer?: boolean; network?: boolean }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code ?? null;
    this.retryAfter = opts.retryAfter ?? null;
    this.fromServer = opts.fromServer ?? false;
    this.network = opts.network ?? false;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type Query = Record<string, string | number | boolean | null | undefined>;

const FALLBACK = {
  it: { network: 'Serve la connessione a internet. Controlla la rete e riprova.', generic: 'Il server non ha risposto come previsto. Riprova tra poco.', config: 'App non configurata: manca l’indirizzo del sito.' },
  en: { network: 'You need an internet connection. Check your network and try again.', generic: 'The server did not respond as expected. Try again shortly.', config: 'App not configured: the site address is missing.' },
};
const fallback = () => FALLBACK[getApiLanguage() === 'en' ? 'en' : 'it'];

function buildUrl(path: string, query?: Query) {
  const qs = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${apiBase()}/${path.replace(/^\/+/, '')}${qs ? `?${qs}` : ''}`;
}

export async function request<T = unknown>(method: Method, path: string, opts: { body?: unknown; query?: Query } = {}): Promise<T> {
  if (!env.siteUrl) throw new ApiError({ message: fallback().config, status: 0 });
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers: {
        Accept: 'application/json',
        'Accept-Language': getApiLanguage(),
        'X-App-Version': env.appVersion,
        'X-App-Platform': Platform.OS,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError({ message: fallback().network, status: 0, network: true });
  }

  let json: unknown = null;
  const raw = await res.text().catch(() => '');
  if (raw) {
    try {
      json = JSON.parse(raw);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const msg = serverMessage(json);
    const header = Number(res.headers.get('Retry-After'));
    throw new ApiError({
      message: msg ?? fallback().generic,
      status: res.status,
      code: errorCode(json),
      retryAfter: retryAfterSeconds(json) ?? (Number.isFinite(header) && header > 0 ? header : null),
      fromServer: !!msg,
    });
  }
  return json as T;
}

export const get = <T = unknown>(path: string, query?: Query) => request<T>('GET', path, { query });
export const post = <T = unknown>(path: string, body?: unknown) => request<T>('POST', path, { body: body ?? {} });
export const del = <T = unknown>(path: string, body?: unknown) => request<T>('DELETE', path, body !== undefined ? { body } : {});

/**
 * Aggiornamento di una risorsa: il Blocco 125 parla di PUT; se il server risponde
 * 405 (metodo diverso per quell'endpoint) si riprova una volta con PATCH e poi POST.
 */
export async function put<T = unknown>(path: string, body: unknown): Promise<T> {
  const methods: Method[] = ['PUT', 'PATCH', 'POST'];
  let last: unknown;
  for (const m of methods) {
    try {
      return await request<T>(m, path, { body });
    } catch (e) {
      last = e;
      if (!(e instanceof ApiError) || e.status !== 405) throw e;
    }
  }
  throw last;
}

export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback().generic;
}
