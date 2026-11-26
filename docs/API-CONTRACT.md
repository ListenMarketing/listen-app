# Contratto delle API usate dall'app

L'app parla solo con le API del sito sotto `/api/app/v1` (Blocco 125, punto 9), con il JWT di
Supabase Auth in `Authorization: Bearer …`. Manda anche `Accept-Language` (`it` o `en`),
`X-App-Version` e `X-App-Platform`.

> **Da verificare con il sito.** Questo file è stato scritto dal testo del Blocco 125, senza poter
> leggere il codice del sito né chiamare le API. I nomi degli endpoint sono quelli del blocco; dove
> il blocco non scrive il nome esatto di un campo, l'app accetta più varianti (elencate in
> `src/api/normalize.ts`, l'unico file da toccare se un nome è diverso). I punti segnati con ⚠️
> sono ipotesi dell'app che il blocco non descrive.

## Errori

Qualsiasi risposta non 2xx: l'app mostra il messaggio del server. Forme accettate:
`{ "message": "…" }`, `{ "message": { "it": "…", "en": "…" } }`, `{ "error": "…" }`,
`{ "error": { "code": "…", "message": … } }`, `message_it` / `message_en`.
Per il blocco del codice (429): `retry_after` in secondi, oppure `bloccato_fino_a`, oppure l'intestazione `Retry-After`.

## Endpoint

| Endpoint | Uso nell'app | Campi letti / inviati |
| --- | --- | --- |
| `GET state` | fase, countdown, permessi, versione minima | `fase`, `date.<fase>.{inizio,fine}`, `prossima_fase_at`, `permessi.{puo_caricare_beat, puo_dare_cuori, puo_prenotare_slot, puo_caricare_brano, puo_acquistare ⚠️, puo_inserire_codice ⚠️, puo_cambiare_regione ⚠️}`, `cuori_disponibili`, `cuori_totali`, `versione_minima`, `playlist.{nome,url}`, `beat_consegnati`, `brani_consegnati`, `regioni_votabili`, `finale.{titolo,testo,premio}`, `link.{regolamento,privacy,termini}` ⚠️, `store.{ios,android}` ⚠️, `limiti.{beat_max_secondi, beat_max_mb}` ⚠️ |
| `GET me` | profilo, ruolo, playlist, iscrizione | `ruolo` (artista/emergente, producer, studio/agency, pubblico), `nome`, `email`, `regione`, `citta`, `telefono`, `instagram`, `da_quando_artista`, `playlist_opened_at`, `playlist_confirmed_at`, `approvato` o `in_verifica` (studio), `iscrizione`, `codice_attivo` ⚠️, `producer` ⚠️ |
| `PUT me` | scelta del ruolo (una volta) e dati del producer (schermata 02) | `{ "ruolo": "artista" }` · `{ nome_arte, citta, instagram, genere }` ⚠️ — se il server risponde 405 l'app riprova con PATCH e poi POST |
| `POST playlist/opened` · `POST playlist/confirm` | passo della playlist | nessun corpo; 409 se non aperta |
| `GET beats?genere=&q=` | schermata 04 | `beats[] {id, titolo, producer.nome_arte, genere, bpm, anteprima_url, cuori, mio, mio_cuore}`, `generi[] {nome, conteggio}`, `totale`, `cuori_disponibili`, `cuori_totali` |
| `GET top10` | schermata 05 e scelta del beat | come `beats`; `messaggio` per il producer fuori dai 10 |
| `GET beats/mine` | schermata 03 | `beat {id, titolo, genere, bpm, anteprima_url, stato, motivo}` |
| `POST beats/mine` ⚠️ | URL firmato per il caricamento | invia `{ azione: "upload_url", file_name, content_type, size, durata_secondi }` → `{ upload_url, path, headers?, metodo? }` |
| `PUT beats/mine` ⚠️ | conferma o sostituzione | `{ path, titolo, genere, bpm }` (`path` null se cambia solo i dati) |
| `DELETE beats/mine` | elimina finché la fase è aperta | — |
| `POST hearts` · `DELETE hearts` | cuori | `{ target_type: "beat"\|"brano", target_id, regione? }` → `{ cuori_disponibili, cuori?, cuore_dato? }` |
| `POST reports` ⚠️ | «Segnala» su beat e brani | `{ target_type, target_id, motivo, nota }` — il Blocco 125 prevede la segnalazione ma non nomina l'endpoint |
| `GET regions` | posti per regione | `regioni[] {regione, capienza, iscritti, posti_liberi?, piena?, messaggio_lista_attesa?}`, `messaggio_lista_attesa`, `pacchetti[] {id, nome, prezzo, comprende[]}` ⚠️ (se mancano l'app usa Base 99 € e Completo 150 € del design) |
| `GET contest/studios?regione=` ⚠️ | studi partner della regione (schermata 07) | `studi[] {id, nome, citta}` — il blocco non nomina l'endpoint |
| `GET` · `POST contest/interest` | prenotazione dello slot (01c) | `nome_arte, regione, citta, telefono, instagram, email, genere, vuole_partecipare, consenso_aggiornamenti` |
| `POST contest/checkout` | pagamento sul sito | `{ pacchetto, regione, regolamento_accettato }` → `{ url }` |
| `POST contest/redeem` | codice e dati (07) | `{ codice, regione, citta, telefono, email, instagram, da_quando_artista, studio_partner_id \| studio_esterno {nome, indirizzo, instagram, telefono, email} }` |
| `GET` · `PUT contest/entry` | la mia pagina (08), scelta del beat | `stato`, `pacchetto`, `regione`, `citta`, `instagram`, `studio {nome, citta, telefono}`, `session_at`, `consegna_studio_at`, `consegna_entro`, `beat`, `puo_scegliere_beat` ⚠️, `puo_caricare_brano` ⚠️ · `PUT { beat_id }` |
| `GET contest/track` | stato del brano (08b) | `stato`, `dati`, `spotify_url`, `consegna_entro` |
| `POST contest/track` ⚠️ | URL firmati per WAV e copertina | `{ azione: "upload_url", tipo: "wav"\|"copertina", file_name, content_type, size, larghezza?, altezza? }` → `{ upload_url, path }` |
| `PUT contest/track` ⚠️ | consegna | `titolo, nome_artista, spotify_profilo, genere, lingua, esplicito, autore_testo, producer, testo, dichiarazioni {brano_mio, testo_non_offende, autorizzo_distribuzione}, wav_path, copertina_path` |
| `GET contest/tracks?regione=` | schermata 09 | `brani[] {id, titolo, nome_arte, genere, beat, anteprima_url, spotify_url, cuori, mio_cuore}`, `cuori_disponibili`, `regioni_votabili` |
| `GET contest/ranking?regione=` | schermata 10 | `pubblicata`, `passati[]`, `wildcard[]` (l'app legge solo nome d'arte, titolo, genere, anteprima, link: **ignora** posizioni e punteggi anche se arrivassero) |
| `GET marketing` | schermata 01d | `titolo`, `testo`, `schede[] {titolo, testo}`, `url_sito`, `nota_pubblico` |
| `POST site-link` | entra nel sito già loggato (mai per il pubblico) | → `{ url }` |
| `POST devices` | token push | `{ token, piattaforma, lingua }` |
| `POST account/delete` | cancellazione dell'account | — |

Il caricamento dei file è un `PUT` del file binario all'URL firmato, con `Content-Type` del file
(più le eventuali `headers` che il server indica).

## Link universali

`https://www.listen-marketing.com/app/<percorso>` e `listenmarketing://<percorso>` → schermata
(tabella in `src/lib/links.ts`): `pagato`, `home`, `producer`, `beat`, `artisti`, `slot`, `codice`,
`brano`, `classifica`, `finale`, `marketing`, `io`, `notifiche`. Le notifiche push portano il link nel campo `data.url`.
