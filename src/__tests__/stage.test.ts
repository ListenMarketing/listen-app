import type { Session } from '@supabase/supabase-js';
import { normalizeMe, normalizeState } from '@/api/normalize';
import { computeStage } from '@/state/session';

const session = (confirmed: boolean) => ({ user: { id: 'u1', email_confirmed_at: confirmed ? '2027-01-01T00:00:00Z' : null } }) as unknown as Session;
const base = { authReady: true, pending: null, meLoading: false, appLoading: false, installed: '1.0.0' };
const app = normalizeState({ fase: 'consegna_beat' });
const me = (o: object) => normalizeMe({ ruolo: 'artista', playlist_confirmed_at: '2027-01-02T00:00:00Z', ...o });

describe('stadio dell’app', () => {
  it('senza account si parte dalla registrazione', () => {
    expect(computeStage({ ...base, session: null, me: null, app: null })).toBe('signedOut');
  });

  it('la verifica dell’email è obbligatoria', () => {
    expect(computeStage({ ...base, session: null, pending: { email: 'a@b.it', password: 'x' }, me: null, app: null })).toBe('confirmEmail');
    expect(computeStage({ ...base, session: session(false), me: null, app: null })).toBe('confirmEmail');
  });

  it('poi il ruolo, poi la playlist, poi l’app', () => {
    expect(computeStage({ ...base, session: session(true), me: me({ ruolo: null }), app })).toBe('role');
    expect(computeStage({ ...base, session: session(true), me: me({ playlist_confirmed_at: null }), app })).toBe('playlist');
    expect(computeStage({ ...base, session: session(true), me: me({}), app })).toBe('ready');
  });

  it('con una versione minima più alta l’app si ferma su «Aggiorna l’app»', () => {
    expect(computeStage({ ...base, session: session(true), me: me({}), app: normalizeState({ fase: 'consegna_beat', versione_minima: '2.0.0' }) })).toBe('update');
  });

  it('senza dati e senza copia locale mostra l’errore con «Riprova»', () => {
    expect(computeStage({ ...base, session: session(true), me: null, app: null })).toBe('error');
    expect(computeStage({ ...base, session: session(true), me: null, app: null, meLoading: true })).toBe('loading');
  });
});
