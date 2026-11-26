import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import React from 'react';
import { api } from '@/api/endpoints';
import { normalizeBeatList, normalizeMe, normalizeRanking, normalizeRegions, normalizeState } from '@/api/normalize';
import type { AppState, Me } from '@/api/types';
import { PlayerProvider } from '@/lib/player';
import { ArtistiSection } from '@/screens/Artisti';
import { HomeScreen } from '@/screens/Home';
import { MarketingScreen } from '@/screens/Marketing';
import { Ranking } from '@/screens/Vote';
import { useSession } from '@/state/session';

// eslint-disable-next-line @typescript-eslint/no-require-imports
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false } }));
jest.mock('expo-linking', () => ({ openURL: jest.fn(() => Promise.resolve()) }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })), dismissBrowser: jest.fn() }));
jest.mock('@/lib/notifications', () => ({ getPushStatus: jest.fn(() => Promise.resolve('undetermined')), requestPushAndRegister: jest.fn() }));
jest.mock('@/state/session', () => ({ useSession: jest.fn() }));
jest.mock('@/api/endpoints', () => ({
  api: { beats: jest.fn(), top10: jest.fn(), interest: jest.fn(), regions: jest.fn(), marketing: jest.fn(), siteLink: jest.fn(), ranking: jest.fn(), entry: jest.fn(), tracks: jest.fn() },
}));

const mockedApi = api as jest.Mocked<typeof api>;
const mockedSession = useSession as jest.Mock;

const res = <T,>(data: T) => ({ data, updatedAt: 1, loading: false, stale: false, error: null, refresh: jest.fn(async () => data), setData: jest.fn() });

function setSession(meRaw: object, stateRaw: object) {
  const me: Me = normalizeMe({ id: 'u1', nome: 'Kid Dama', playlist_confirmed_at: '2027-01-02T00:00:00Z', regione: 'Lombardia', ...meRaw });
  const app: AppState = normalizeState(stateRaw);
  mockedSession.mockReturnValue({ stage: 'ready', session: { user: { id: 'u1', email: 'kid@example.com' } }, me: res(me), app: res(app), refreshAll: jest.fn(), signOut: jest.fn(), pending: null, setPending: jest.fn() });
}

const show = (ui: React.ReactElement) => render(<PlayerProvider>{ui}</PlayerProvider>);

const REGIONS = {
  regioni: [
    { regione: 'Lombardia', capienza: 200, iscritti: 156 },
    { regione: 'Lazio', capienza: 100, iscritti: 100, messaggio_lista_attesa: 'Regione piena: paghi ed entri in lista d’attesa' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedApi.interest.mockResolvedValue(null);
  mockedApi.regions.mockResolvedValue(normalizeRegions(REGIONS));
  mockedApi.marketing.mockResolvedValue({ title: null, intro: null, cards: [], siteUrl: 'https://www.listen-marketing.com', publicNote: null });
});

describe('home per ruolo in fase consegna_beat', () => {
  const state = { fase: 'consegna_beat', permessi: { puo_caricare_beat: true, puo_prenotare_slot: true }, beat_consegnati: 812 };

  it('il producer vede il countdown e «Carica il tuo beat · gratis»', async () => {
    setSession({ ruolo: 'producer' }, { ...state, date: { consegna_beat: { fine: '2099-01-31T22:59:00Z' } } });
    await show(<HomeScreen />);
    expect(screen.getByText('Carica il tuo beat · gratis')).toBeOnTheScreen();
    expect(screen.getByTestId('countdown')).toBeOnTheScreen();
    expect(screen.getByText('812 beat consegnati')).toBeOnTheScreen();
    expect(screen.queryByTestId('slot-card')).toBeNull();
  });

  it('l’artista vede l’attesa con «Prenota il tuo slot», senza prezzi', async () => {
    setSession({ ruolo: 'artista' }, state);
    await show(<HomeScreen />);
    expect(screen.getByText('I producer stanno consegnando i beat')).toBeOnTheScreen();
    expect(screen.getByTestId('slot-card')).toBeOnTheScreen();
    expect(screen.getByText('Prenota il tuo slot a Chiamarsi Artisti')).toBeOnTheScreen();
    expect(screen.queryByText(/€/)).toBeNull();
    expect(screen.getByText('Attiva le notifiche')).toBeOnTheScreen();
  });

  it('dopo la prenotazione la scheda diventa «Slot prenotato»', async () => {
    mockedApi.interest.mockResolvedValue({ stageName: 'Kid Dama', region: 'Lombardia', city: 'Milano', phone: '1', instagram: '', email: '', genre: 'Trap', wantsToJoin: true, updatesConsent: false });
    setSession({ ruolo: 'artista' }, state);
    await show(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('Slot prenotato · ti avvisiamo quando aprono le iscrizioni')).toBeOnTheScreen());
  });

  it('pubblico e studio vedono l’attesa senza la scheda «Prenota»', async () => {
    setSession({ ruolo: 'pubblico' }, state);
    await show(<HomeScreen />);
    expect(screen.getByText('I producer stanno consegnando i beat')).toBeOnTheScreen();
    expect(screen.queryByTestId('slot-card')).toBeNull();
  });

  it('lo studio non ancora approvato vede «Account in verifica»', async () => {
    setSession({ ruolo: 'agency', approvato: false }, state);
    await show(<HomeScreen />);
    expect(screen.getByText('Account in verifica')).toBeOnTheScreen();
  });
});

describe('fase cuori_beat', () => {
  it('tutti vedono i beat con «hai N cuori»; il cuore chiama il server', async () => {
    mockedApi.beats.mockResolvedValue(
      normalizeBeatList({ beats: [{ id: 'b1', titolo: 'Notte a Scampia', producer: { nome_arte: 'Nando Beats' }, genere: 'Trap', bpm: 142, anteprima_url: 'https://x/1.mp3' }, { id: 'b2', titolo: 'Cemento', genere: 'Drill' }], cuori_disponibili: 5, cuori_totali: 5, totale: 100 }),
    );
    (mockedApi as any).giveHeart = jest.fn().mockResolvedValue({ available: 4, count: null, given: true });
    setSession({ ruolo: 'pubblico' }, { fase: 'cuori_beat', permessi: { puo_dare_cuori: true }, cuori_disponibili: 5 });
    await show(<HomeScreen />);
    await waitFor(() => expect(screen.getByText('Notte a Scampia')).toBeOnTheScreen());
    expect(screen.getByTestId('heart-counter')).toHaveTextContent('Hai 5 cuori');
    expect(screen.getByText('Nando Beats · Trap · 142 BPM')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Dai un cuore a Cemento' }));
    await waitFor(() => expect(screen.getByTestId('heart-counter')).toHaveTextContent('Hai 4 cuori'));
    expect((mockedApi as any).giveHeart).toHaveBeenCalledWith('beat', 'b2', undefined);
    expect(screen.getByRole('button', { name: 'Togli il cuore a Cemento' })).toBeOnTheScreen();
  });
});

describe('Chiamarsi Artisti (06)', () => {
  it('prima delle iscrizioni non mostra prezzi né pacchetti', async () => {
    setSession({ ruolo: 'artista' }, { fase: 'consegna_beat', permessi: { puo_prenotare_slot: true } });
    await show(<ArtistiSection />);
    await waitFor(() => expect(screen.getByText('156 / 200')).toBeOnTheScreen());
    expect(screen.queryByText(/€/)).toBeNull();
    expect(screen.queryByText('Prenota e paga')).toBeNull();
    expect(screen.getByTestId('artisti-slot')).toBeOnTheScreen();
  });

  it('con le iscrizioni aperte mostra Base e Completo e «Prenota e paga»', async () => {
    setSession({ ruolo: 'artista' }, { fase: 'iscrizioni', permessi: { puo_acquistare: true } });
    await show(<ArtistiSection />);
    await waitFor(() => expect(screen.getByText('156 / 200')).toBeOnTheScreen());
    expect(screen.getByText('99 €')).toBeOnTheScreen();
    expect(screen.getByText('150 €')).toBeOnTheScreen();
    expect(screen.getByTestId('artisti-pay')).toBeDisabled();
    expect(screen.getByText('Inserisci il codice')).toBeOnTheScreen();
    expect(screen.getByText('100 / 100 · lista d\'attesa')).toBeOnTheScreen();
  });

  it('producer, pubblico e studio non possono pagare', async () => {
    setSession({ ruolo: 'producer' }, { fase: 'iscrizioni', permessi: { puo_acquistare: false } });
    await show(<ArtistiSection />);
    await waitFor(() => expect(screen.getByText('156 / 200')).toBeOnTheScreen());
    expect(screen.queryByTestId('artisti-pay')).toBeNull();
    expect(screen.queryByText('Inserisci il codice')).toBeNull();
  });
});

describe('Marketing (01d)', () => {
  it('artista, producer e studio entrano nel sito già loggati con site-link', async () => {
    mockedApi.siteLink.mockResolvedValue('https://www.listen-marketing.com/auth/app-link?token=abc');
    setSession({ ruolo: 'artista' }, { fase: 'consegna_beat' });
    await show(<MarketingScreen />);
    expect(screen.getByText('Fai la tua prossima campagna con noi')).toBeOnTheScreen();
    expect(screen.getByText('Talent House')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('marketing-open'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://www.listen-marketing.com/auth/app-link?token=abc'));
    expect(screen.queryByTestId('marketing-public')).toBeNull();
  });

  it('il pubblico apre il sito e basta, con la frase che spiega per chi è', async () => {
    setSession({ ruolo: 'pubblico' }, { fase: 'consegna_beat' });
    await show(<MarketingScreen />);
    await waitFor(() => expect(mockedApi.marketing).toHaveBeenCalled());
    await fireEvent.press(screen.getByTestId('marketing-open'));
    await waitFor(() => expect(Linking.openURL).toHaveBeenCalledWith('https://www.listen-marketing.com'));
    expect(mockedApi.siteLink).not.toHaveBeenCalled();
    expect(screen.getByTestId('marketing-public')).toBeOnTheScreen();
  });
});

describe('classifiche (10)', () => {
  it('mostra i passati e le wild card come pubblicati, senza numeri', async () => {
    mockedApi.ranking.mockResolvedValue(
      normalizeRanking({ regione: 'Lombardia', pubblicata: true, passati: [{ id: 1, nome_arte: 'Seven', titolo: 'Via Padova', punteggio_pesato: 1412, cuori_semplici: 987, posizione: 1 }], wildcard: [{ id: 2, nome_arte: 'Dado', titolo: 'Sabato' }] }),
    );
    setSession({ ruolo: 'pubblico' }, { fase: 'classifiche' });
    await show(<Ranking />);
    await waitFor(() => expect(screen.getByText('Seven · Via Padova')).toBeOnTheScreen());
    expect(screen.getByText('Dado · Sabato')).toBeOnTheScreen();
    expect(screen.queryByText(/1412|987|PUNTI|punti/)).toBeNull();
  });
});
