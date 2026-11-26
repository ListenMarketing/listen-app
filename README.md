# Listen · app

L'app «Listen» per iOS e Android (Expo SDK 58, React Native, TypeScript, expo-router).
Stesso account del sito [listen-marketing.com](https://www.listen-marketing.com); dentro c'è la sezione
**Chiamarsi** (Chiamarsi Producer e Chiamarsi Artisti) e la sezione **Marketing**, che rimanda al sito.

L'app **non contiene regole**: fasi, permessi, cuori disponibili, posti e codici li decide il server
del sito (Blocco 125, API sotto `/api/app/v1`) e l'app mostra quello che le API rispondono.

## Cosa c'è nel repository (e cosa no)

- Solo valori pubblici per costruzione: URL del sito, URL del progetto Supabase, chiave **anon**.
- Mai chiavi segrete, service role, chiavi Stripe, certificati, credenziali di prova (`npm run check:secrets` lo controlla).
- Nessun SDK di tracciamento o pubblicità, nessun acquisto in-app, nessuna API di Spotify, Instagram o TikTok.
- Audio e immagini si caricano solo nei bucket privati di Listen, con gli URL firmati delle API.

## Avvio in locale

```bash
npm install
```

```bash
cp .env.example .env.local
```

Compila `.env.local` con il sito di anteprima di Vercel, l'URL del progetto Supabase e la chiave anon, poi:

```bash
npx expo start
```

Serve una development build (`eas build --profile development`): l'app usa moduli nativi che Expo Go non ha tutti.

## Controlli

```bash
npm run check
```

Esegue typecheck, lint, controllo dei testi (italiano e inglese allineati), controllo dei segreti e i test Jest
(contatore dei cuori, formattazione del codice, durata e peso del file, bottone della playlist, home per ruolo e fase…).
I flussi end-to-end sono in [.maestro/](.maestro/README.md).

## Struttura

| Cartella | Contenuto |
| --- | --- |
| `src/app` | Rotte (expo-router). `_layout.tsx` decide cosa si vede in ogni stadio: registrazione → email → ruolo → playlist → app |
| `src/screens` | Le schermate del design (00 … 11) |
| `src/api` | Client delle API del sito. `normalize.ts` è l'unico punto dove si leggono i nomi dei campi del server |
| `src/lib` | Formattazione, controlli dei file, cuori, cache locale, notifiche, link universali |
| `src/i18n` | Testi in italiano e inglese; per un'altra lingua basta un file in più |
| `docs` | [Contratto delle API](docs/API-CONTRACT.md), [rilascio con EAS](docs/RELEASE.md), [scheda e revisione degli store](docs/STORE.md) |

## Lingue

Italiano e inglese. Per aggiungere le altre 4 lingue del sito: copia `src/i18n/it.json`, traducilo e
aggiungilo a `resources` in `src/i18n/index.ts` (`npm run check:i18n` segnala le chiavi mancanti).
