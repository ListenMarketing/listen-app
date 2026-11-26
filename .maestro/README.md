# Test dei flussi (Maestro)

I flussi girano contro il **sito di anteprima** con gli account di prova creati da Giuseppe.
Le credenziali **non stanno nel repository né in chat**: si passano da riga di comando.

```bash
maestro test .maestro/primo-avvio.yaml -e EMAIL=... -e PASSWORD=...
```

```bash
maestro test .maestro/carica-beat.yaml -e EMAIL=... -e PASSWORD=...
```

```bash
maestro test .maestro/cuori.yaml -e EMAIL=... -e PASSWORD=...
```

```bash
maestro test .maestro/codice.yaml -e EMAIL=... -e PASSWORD=... -e CODICE=LM27-....
```

| Flusso | Account di prova | Fase dell'edizione di prova |
| --- | --- | --- |
| `primo-avvio.yaml` | email verificata, **senza ruolo** e senza playlist | qualsiasi |
| `carica-beat.yaml` | producer con playlist confermata, senza beat | `consegna_beat` |
| `cuori.yaml` | qualsiasi ruolo con playlist confermata, 100 beat in gara (5 cuori) | `cuori_beat` |
| `codice.yaml` | artista con playlist confermata e un codice pagato non ancora usato | `iscrizioni` |

Per `carica-beat.yaml` servono sul telefono (o sul simulatore) due file nella cartella dei
documenti: `beat-28s.wav` (28 secondi) e `beat-41s.wav` (41 secondi).
