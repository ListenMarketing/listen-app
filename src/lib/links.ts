import { env } from './env';

/**
 * Link universali https://www.listen-marketing.com/app/* e schema listenmarketing://
 * → percorso dentro l'app. Tutto ciò che non si riconosce porta alla home.
 */
const ROUTES: Record<string, string> = {
  '': '/',
  home: '/',
  pagato: '/pagato',
  producer: '/producer',
  beat: '/beat',
  candidatura: '/candidatura',
  artisti: '/artisti',
  slot: '/slot',
  codice: '/codice',
  brano: '/brano',
  iscrizione: '/artisti',
  cuori: '/',
  vota: '/',
  classifica: '/classifica',
  finale: '/finale',
  marketing: '/marketing',
  io: '/io',
  notifiche: '/notifiche',
};

export function mapUrlToRoute(url: string | null | undefined): string {
  if (!url) return '/';
  let path = url.trim();
  let query = '';
  const q = path.indexOf('?');
  if (q >= 0) {
    query = path.slice(q);
    path = path.slice(0, q);
  }
  path = path.replace(/#.*$/, '');
  // schema proprio: listenmarketing://pagato
  path = path.replace(new RegExp(`^${env.scheme}:/*`, 'i'), '/');
  // link universale: https://www.listen-marketing.com/app/pagato
  path = path.replace(/^https?:\/\/[^/]+/i, '');
  path = path.replace(/^\/+/, '');
  if (path === 'app' || path.startsWith('app/')) path = path.slice(3).replace(/^\/+/, '');
  const first = path.split('/')[0].toLowerCase();
  const route = ROUTES[first];
  if (!route) return '/';
  return route === '/pagato' ? route + query : route;
}
