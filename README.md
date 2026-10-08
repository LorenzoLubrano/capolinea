# App spese

App personale per tenere le spese, per iOS e Android. I dati restano sul telefono, l'app non ha costi ricorrenti e la privacy è attiva di serie.

> **Stato: fase 1, prototipo navigabile.** Tutte le schermate funzionano con dati di esempio che vivono in memoria. Chiudendo l'app i dati si perdono. Il database sul telefono (SQLite) e la sincronizzazione facoltativa arrivano nella fase 2.

La direzione visiva si chiama **Linea** e riprende la metropolitana di Milano:

- ogni categoria è una linea colorata;
- i movimenti sono fermate;
- il budget è il capolinea;
- il rosso compare solo oltre il capolinea.

Il sistema visivo è descritto in [DESIGN.md](DESIGN.md), il prodotto in [PRODUCT.md](PRODUCT.md) e le decisioni prese in [docs/decisioni.md](docs/decisioni.md).

## Cosa serve

- Node.js in versione LTS (provato con la 24).
- Sul telefono **Expo Go per l'SDK 57**: [Android](https://play.google.com/store/apps/details?id=host.exp.exponent) o [iOS/iPadOS](https://apps.apple.com/app/expo-go/id982107779). Il prototipo usa solo i moduli già inclusi in Expo Go, quindi non serve una build di sviluppo.

## Avvio

```bash
npm install
npx expo start
```

- **Telefono:** inquadra il codice QR con Expo Go (su iOS con la Fotocamera). Il computer e il telefono devono essere sulla stessa rete.
- **Browser:** premi `w`, oppure avvia con `npx expo start --web`. È comodo per guardare le schermate, ma alcune cose esistono solo sul telefono:
  - l'avviso «Scartare quello che hai scritto?»;
  - la biometria;
  - le vibrazioni;
  - il vetro dei fogli.
- **Emulatore Android:** premi `a` con un emulatore acceso.

Al primo avvio i dati di esempio sono fissati al **24 ottobre 2026**, così ogni schermata ha qualcosa da mostrare.

## Pannello prototipo

Solo nelle build di sviluppo, da **Profilo › Info › Pannello prototipo**:

- **Dati di esempio:** pieni, senza entrate, oppure casi limite (nomi lunghissimi, importi enormi, budget sforati, rimborsi più grandi della spesa).
- **Data di oggi:** 24 ottobre, 1 ottobre, 31 ottobre oppure la data vera.
- **Lentezza ed errori:** ogni lettura aspetta 2 secondi, oppure le letture falliscono, per vedere il caricamento e gli errori.
- **Stati della sincronizzazione** simulati.
- **Rivedi il primo avvio:** riporta all'onboarding con i dati vuoti.

In una build di rilascio il pannello non esiste.

## Comandi

```bash
npm test              # test (Jest)
npm run typecheck     # TypeScript
npm run lint          # ESLint
```

Per aggiungere una libreria usa `npx expo install <pacchetto>`, che sceglie la versione adatta all'SDK.

## Com'è fatto

- **Stack:**
  - Expo SDK 57, React Native 0.86 e React 19.2 con il React Compiler;
  - TypeScript strict;
  - Expo Router per la navigazione;
  - Reanimated 4 per le animazioni;
  - TanStack Query per i dati e zustand per lo stato.
- **Importi:** sempre in centesimi interi, mai in virgola mobile.
- **Testi:** tutti in [src/i18n/it.ts](src/i18n/it.ts).

| Cartella | Cosa contiene |
|---|---|
| `src/app/` | Le rotte: ogni file è una schermata, i `_layout.tsx` sono i navigatori |
| `src/domain/` | Logica pura e testata: date, importi, budget e previsione, abbonamenti, divisioni, obiettivi, analisi |
| `src/data/` | Repository in memoria, dati di esempio e varianti, query di TanStack |
| `src/features/` | Le schermate, divise per area: home, add, transactions, budget, analytics, money, settings, onboarding, security |
| `src/components/` | Componenti condivisi: linee, fermate, cifre, chip, fogli, avvisi |
| `src/theme/` | Token di colore, tipografia, spaziatura, movimento |
| `src/services/` | Formati, accessibilità, aptica, sicurezza, file |
| `src/state/` | Stato dell'app (impostazioni, blocco, filtri, avvisi) |

## Privacy e sicurezza

- **Account, rete e tracciamento:** nella fase 1 non ci sono. I dati non lasciano il telefono.
- **Modalità privacy:** nasconde gli importi anche a VoiceOver e TalkBack.
- **PIN:**
  - è salvato come hash SHA-256 con sale;
  - dopo 4 tentativi sbagliati l'attesa cresce;
  - si può sbloccare anche con volto o impronta.
- **Esportazioni:** il CSV e il backup si condividono; la copia temporanea si cancella all'avvio successivo. Prima di ripristinarlo, un backup viene controllato campo per campo.
- **Segreti:** nessuna chiave né credenziale nel codice.

## Licenza

Da scegliere prima di pubblicare il repository.
