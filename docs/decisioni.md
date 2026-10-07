# Decisioni

Registro delle decisioni di prodotto e tecniche. Il piano completo della fase 1 è in `piano-fase-1.html`.

## 07/10/2026: approvazione del piano della fase 1

| | Decisione | Scelta |
|---|---|---|
| D1 | Tecnologia del prototipo | Expo SDK 57 + React Native + TypeScript strict da subito |
| D2 | Lingua | Interfaccia in italiano con testi centralizzati, formato `1.284,62 €`; codice in inglese |
| D3 | Nome e cartella | Nome provvisorio `app-spese` in `Desktop\Progetti\app-spese`; il nome vero in una costante |
| D4 | Spese divise | Nelle statistiche conta solo la quota dell'utente |
| D5 | Saldo totale | Conti con «incluso nel saldo totale»; di base tutti tranne il conto deposito |
| D6 | Mese di budget | Dal giorno 1; giorno di inizio diverso previsto nel modello |
| D7 | Data finta del prototipo | 24 ottobre 2026, cambiabile dal pannello del prototipo |
| D8 | Skill | Skill installate del piano + 5 skill di `expo/skills` (commit `d4f4840`) copiate a mano, senza plugin |
| D9 | Dispositivi | Nessun iPhone; prove iOS su iPad con iPadOS 26 tramite Expo Go, Android su Galaxy S24 Ultra |

## 07/10/2026: risposte all'intervista di impeccable

- Stessa identità visiva su iOS e Android; cambiano solo i comportamenti di sistema.
- Inserimento sia subito dopo il pagamento sia la sera, più spese di fila.
- Su iPad e sul web l'app si mostra in una colonna larga come un telefono.
- Solo librerie incluse in Expo Go, perché iOS si prova solo con Expo Go.

## 07/10/2026: direzione visiva (Fermata 1)

- Scelta **Linea**: segnaletica della Metropolitana di Milano (Bob Noorda, 1964). Bianco smalto e nero stazione, un solo grottesco (Archivo), categorie come linee colorate, il mese come fascia continua con il segno «sei qui» e il budget come capolinea.
- Scartate dopo aver visto le bozze in chiaro e scuro: Libretto (assegnata dal sorteggio di impeccable), Portabiglietti, Carta e inchiostro.
- Bozze: artifact `R86TgzkkpsoQSTaw7FEWTU`. Contratto della direzione: `.impeccable/surfaces/src-app-tabs-index-tsx.md` (chiave del sorteggio `6fb91965`).
- Il rosso resta riservato ad avvisi e azioni distruttive: nessuna categoria usa il rosso.

## 07/10/2026: pulizia del modello di Expo

- Tolto `.claude/settings.json`: attivava il plugin Expo (hook di telemetria, server MCP remoto), scartato nel piano.
- Tolto `LICENSE`: era la licenza MIT del modello con copyright di Expo. La licenza del progetto va scelta prima di pubblicare.
