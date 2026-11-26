# Rilascio con EAS (lo fa Giuseppe dal suo terminale)

I login ad Apple e a Expo si fanno nel terminale: password, chiavi e certificati non passano dalla chat
e non entrano nel repository. I certificati li gestisce EAS negli account Apple e Google.

## 1. Una volta sola

1. In `eas.json` sostituisci i tre `DA_INSERIRE` di ogni profilo: URL di anteprima di Vercel
   (profili `development` e `preview`), URL del progetto Supabase e chiave **anon**. Sono valori pubblici.
   La build di produzione si rifiuta di partire se trova un `DA_INSERIRE` o un sito diverso da quello di produzione.
2. Collega il progetto a Expo:

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

   `eas init` crea il progetto e scrive il suo id: mettilo nella variabile `EAS_PROJECT_ID` del progetto
   su expo.dev (Environment variables, visibilità «plain text»), così `app.config.ts` lo legge. Serve anche per le notifiche push.
3. Il sito serve già `apple-app-site-association` e `assetlinks.json`: controlla che nel primo ci sia
   `<TEAM ID>.com.listenmarketing.app` con il percorso `/app/*`. Il Team ID non è scritto nel repository
   (nel messaggio del blocco era rimasto il segnaposto): EAS lo chiede al login Apple; se vuoi fissarlo, imposta `APPLE_TEAM_ID` su expo.dev.

## 2. iOS → TestFlight (prima consegna)

```bash
npx eas-cli@latest build --platform ios --profile production
```

```bash
npx eas-cli@latest submit --platform ios --profile production
```

- Alla prima build EAS crea certificato di distribuzione, profilo e chiave APNs per le notifiche (rispondi sì).
- Su App Store Connect: se «Listen» non è disponibile come nome della scheda usa «Listen Marketing»
  (sotto l'icona resta «Listen»). Aggiungi gli studi partner ai tester di TestFlight per le due settimane di prova.
- Quando l'app ha il suo id numerico, impostalo come `EXPO_PUBLIC_IOS_APP_STORE_ID` (serve al bottone «Aggiorna l'app»
  se `state` non manda l'indirizzo dello store).

## 3. Android (quando c'è l'account Google Play)

1. Notifiche: su Android Expo consegna le push tramite FCM. Crea il progetto Firebase **solo per Cloud Messaging**
   (niente Analytics), carica la chiave del service account in EAS (`eas credentials`) e aggiungi
   `google-services.json` come file segreto di EAS (non nel repository), indicandolo in `app.config.ts` (`android.googleServicesFile`).
2. Build e consegna al test interno:

```bash
npx eas-cli@latest build --platform android --profile production
```

```bash
npx eas-cli@latest submit --platform android --profile production
```

3. Prendi l'impronta SHA-256 del certificato di firma (Play Console → Integrità dell'app, oppure `eas credentials`)
   e inseriscila in `assetlinks.json` sul sito, altrimenti i link `https://www.listen-marketing.com/app/*` non aprono l'app.

## 4. Prima di ogni rilascio

```bash
npm run check
```

- Flussi Maestro contro l'anteprima (vedi `.maestro/README.md`).
- Versione: `version` in `app.config.ts`; il numero di build lo incrementa EAS (`autoIncrement`).
- Se una versione vecchia non deve più funzionare, alza `versione_minima` in Admin: l'app mostra «Aggiorna l'app».

## Icona e splash

`assets/icon.png`, `assets/splash-icon.png` e le icone Android sono **provvisorie**: sono generate dal logo
a bassa risoluzione preso dal canvas del design (300×78). Vanno sostituite con il logo Listen in alta risoluzione
(icona 1024×1024 senza trasparenza; primo piano Android 1024×1024 con margini).
