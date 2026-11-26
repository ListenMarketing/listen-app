import { mapUrlToRoute } from '@/lib/links';

/**
 * Link in arrivo dal sistema: i link universali https://www.listen-marketing.com/app/*
 * e lo schema listenmarketing:// diventano percorsi dell'app (es. /app/pagato → /pagato).
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return mapUrlToRoute(path);
  } catch {
    return '/';
  }
}
