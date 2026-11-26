# Scheda degli store e revisione

## Identificativi

| | |
| --- | --- |
| Nome sotto l'icona | Listen |
| Nome nella scheda | Listen (se non disponibile: Listen Marketing) |
| Bundle id iOS · package Android | `com.listenmarketing.app` |
| Schema · link universali | `listenmarketing://` · `https://www.listen-marketing.com/app/*` |
| Minimo | iOS 16.4 (richiesto da Expo SDK 58; il blocco chiedeva iOS 16) · Android 10 |
| Lingue | Italiano, inglese |

## Note per il revisore (da incollare, con gli account creati da Giuseppe)

> Listen is the companion app of listen-marketing.com. During the two "Chiamarsi" contests the app is centred on
> the contest: producers upload one 30-second beat for free, everyone gives "hearts", artists book a studio session.
>
> **Test accounts** (email already verified): account A is in the "beat delivery" phase, account B in the "hearts" phase.
> A: [EMAIL] / [PASSWORD] · B: [EMAIL] / [PASSWORD]
>
> **Payments.** The app sells no digital content and has no in-app purchases. Artists can book a *real-world service*:
> a 2-hour recording session in a physical partner studio, plus the distribution of the recorded track.
> Because it is a physical service consumed outside the app (App Store Review Guideline 3.1.3(e); Google Play Payments
> policy, physical goods and services), it is paid through the website checkout (Stripe), opened in the system browser.
> The "Marketing" tab only links to the website: nothing is sold there inside the app.
>
> **User-generated content.** Beats and tracks are uploaded by users. Every item has a "Report" button
> (reason + free text) that reaches our moderation team, and users can hide any item for themselves.
> Uploaders accept the contest rules at sign-up; our team can exclude content and accounts from the admin panel.
>
> **Account deletion.** Tab "Io" (Me) → "Elimina il mio account" (Delete my account): deletion is immediate.
> Only orders are kept, as required by accounting law.
>
> **Spotify.** The app has no Spotify integration and no Spotify login. The playlist step only opens a link and records the tap.
>
> **Sign in.** Email and password only (no third-party login), so Sign in with Apple is not offered.
>
> **Notifications.** Asked only after onboarding, on a screen that explains what they are for.

## Etichette privacy (App Store) · Sicurezza dei dati (Google Play)

Nessun tracciamento, nessun SDK di terzi per pubblicità o analisi. Dati raccolti, tutti **collegati all'utente**,
usati solo per il **funzionamento dell'app**:

| Dato | Categoria Apple | Perché |
| --- | --- | --- |
| Email | Contact Info → Email Address | account |
| Nome o nome d'arte | Contact Info → Name | account, profilo nel contest |
| Telefono, città, regione, Instagram | Contact Info → Phone Number · Other User Contact Info | iscrizione e prenotazione dello slot |
| Ruolo, dati dell'iscrizione, studio preferito | User Content → Other User Content | iscrizione al contest |
| Beat, brani, copertine, testi | User Content → Audio Data · Photos · Other User Content | contenuti caricati dall'utente |
| Token push | Identifiers → Device ID | notifiche |

«Data used to track you»: **nessuno**. Su Google Play: dati cifrati in transito, cancellazione richiedibile dall'app.
Pagine sul sito: privacy e termini (l'app le apre da «Io»; l'indirizzo arriva da `state` oppure è `/privacy` e `/termini`).

## Classificazione per età

L'app mostra contenuti caricati dagli utenti (musica, anche con testi espliciti): nel questionario indicare
contenuti generati dagli utenti, linguaggio volgare «poco frequente o moderato», nessun gioco d'azzardo
(da confermare con il legale per il concorso a premi). Risultato atteso: 12+ su App Store, «Teen» o superiore su Google Play.
L'età minima del contest (18 anni o consenso dei genitori) sta nel regolamento, non nell'app.

## Schermate

Dagli artboard del canvas «Listen · app»: 00 Registrati, 00a Chi sei, 01 Home, 04 I beat e i cuori, 06 Chiamarsi Artisti, 08 La mia pagina.
Attenzione: negli artboard 05 e 10 compaiono cuori e «punti» d'esempio; l'app mostra solo ciò che pubblicano le API
(nessun punteggio), quindi per quelle due meglio usare schermate vere prese da TestFlight.

## Lista prima dell'invio

- [ ] Icona e splash con il logo definitivo (vedi `docs/RELEASE.md`)
- [ ] `eas.json` con i valori di produzione; `npm run check` verde
- [ ] `apple-app-site-association` con il Team ID giusto; link `/app/pagato` che riapre l'app
- [ ] Due account di prova (fase consegna_beat e fase cuori) nelle note per il revisore
- [ ] Privacy e termini raggiungibili dal sito
- [ ] Due settimane di TestFlight (e test interno Google Play) con gli studi partner
