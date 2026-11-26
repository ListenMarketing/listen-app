import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState as RNAppState } from 'react-native';
import { api } from '@/api/endpoints';
import type { AppState, Me } from '@/api/types';
import { clearUserData } from '@/lib/cache';
import { env } from '@/lib/env';
import { needsUpdate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useResource, type Resource } from '@/lib/useResource';

/**
 * Stato di sessione: account (Supabase Auth), `me` e `state` (API del sito).
 * Da qui esce lo «stadio» dell'app, che decide quale parte si può vedere.
 */
export type Stage =
  | 'loading'
  | 'signedOut'
  | 'confirmEmail'
  | 'error'
  | 'update'
  | 'role'
  | 'playlist'
  | 'ready';

/** Registrazione in attesa della conferma dell'email: resta solo in memoria. */
type Pending = { email: string; password: string } | null;

type Ctx = {
  stage: Stage;
  session: Session | null;
  me: Resource<Me>;
  app: Resource<AppState>;
  pending: Pending;
  setPending: (p: Pending) => void;
  refreshAll: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);

export function computeStage(i: {
  authReady: boolean;
  session: Session | null;
  pending: Pending;
  me: Me | null;
  app: AppState | null;
  meLoading: boolean;
  appLoading: boolean;
  installed: string;
}): Stage {
  if (!i.authReady) return 'loading';
  if (!i.session) return i.pending ? 'confirmEmail' : 'signedOut';
  if (!i.session.user.email_confirmed_at) return 'confirmEmail';
  if (!i.me || !i.app) return i.meLoading || i.appLoading ? 'loading' : 'error';
  if (i.me.emailVerified === false) return 'confirmEmail';
  if (needsUpdate(i.installed, i.app.minVersion)) return 'update';
  if (!i.me.role) return 'role';
  if (!i.me.playlistConfirmedAt) return 'playlist';
  return 'ready';
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [pending, setPending] = useState<Pending>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => setAuthReady(true));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) setPending(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const uid = session?.user.email_confirmed_at ? session.user.id : null;
  const me = useResource<Me>(uid ? `me.${uid}` : null, api.me);
  const app = useResource<AppState>(uid ? `state.${uid}` : null, api.state);

  const refreshMe = me.refresh;
  const refreshApp = app.refresh;
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshMe(), refreshApp()]);
  }, [refreshMe, refreshApp]);

  // Al ritorno in primo piano si richiede lo stato: la fase la cambia l'Admin.
  useEffect(() => {
    if (!uid) return;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') void refreshAll();
    });
    return () => sub.remove();
  }, [uid, refreshAll]);

  const signOut = useCallback(async () => {
    setPending(null);
    try {
      await supabase.auth.signOut();
    } catch {
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }
    await clearUserData();
  }, []);

  const stage = computeStage({
    authReady,
    session,
    pending,
    me: me.data,
    app: app.data,
    meLoading: me.loading,
    appLoading: app.loading,
    installed: env.appVersion,
  });

  const value = useMemo<Ctx>(
    () => ({ stage, session, me, app, pending, setPending, refreshAll, signOut }),
    [stage, session, me, app, pending, refreshAll, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession fuori da SessionProvider');
  return ctx;
}
