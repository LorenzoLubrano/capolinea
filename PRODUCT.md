# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Stack

Expo SDK 57 + React Native 0.86 + TypeScript strict + Expo Router (scelta dell'utente, decisione D1 in `docs/decisioni.md`). Solo librerie incluse in Expo Go: il prototipo si prova con Expo Go su un Galaxy S24 Ultra (Android 16) e su un iPad (iPadOS 26), e nell'emulatore Android. L'anteprima web (react-native-web) serve solo per occhiate veloci e schermate.

## Users

Una persona che tiene traccia delle proprie spese personali, in euro, in Italia. Per ora l'app ha un solo utente; l'architettura non deve impedire più utenti in futuro.

Due momenti d'uso, entrambi da servire bene:
- subito dopo aver pagato: in piedi, con una mano, pochi secondi per registrare una spesa;
- la sera: più spese di fila, anche con date dei giorni passati.

Aprendo l'app vuole capire in pochi secondi quanto ha speso nel mese, quanto resta del budget, com'è andata rispetto al mese scorso, il saldo totale e gli ultimi movimenti.

## Product Purpose

Rendere il controllo delle spese leggero invece che amministrativo. Successo vuol dire:
- capire la situazione del mese in meno di 5 secondi dall'apertura;
- registrare una spesa comune in meno di 5 secondi (importo, categoria, salva);
- nessun costo ricorrente di infrastruttura e nessun servizio a pagamento necessario per usare i propri dati;
- dati sempre esportabili in formati aperti.

## Positioning

Funziona tutto sul telefono, offline, senza account e senza abbonamenti: il database locale è la fonte di verità e il cloud è un'aggiunta facoltativa che si può spegnere o perdere senza conseguenze. La privacy è una funzione di primo piano (blocco biometrico, modalità privacy che nasconde ogni importo). Tiene insieme tutti i conti, contanti compresi, senza collegarsi alle banche. Previsioni e avvisi seguono regole semplici e spiegate, senza intelligenza artificiale.

## Operating Context

- Telefoni iOS e Android; uso a una mano, occhiate veloci, inserimenti in serie la sera.
- Valuta predefinita EUR, formati italiani (`1.284,62 €`), settimana da lunedì. Interfaccia in italiano con tutti i testi centralizzati per aggiungere l'inglese; codice in inglese (il repository può diventare pubblico).
- Esercenti tipici: Esselunga, Trenitalia, Amazon, Spotify, palestra, bar. Si mostrano come testo e monogramma, mai con i loghi dei marchi.
- Fase 1: prototipo navigabile con dati finti realistici; data finta 24 ottobre 2026, cambiabile dal pannello del prototipo.

## Capabilities and Constraints

Funzioni (modello dati completo già in fase 1, anche dove l'interfaccia è secondaria):
- movimenti: spesa, entrata, trasferimento, rimborso, addebito generato da abbonamento;
- abbonamenti con creazione automatica dei movimenti alla data di addebito; il movimento generato tiene il riferimento all'abbonamento e si modifica da solo;
- budget mensile globale e per categoria, con previsione di fine mese deterministica;
- obiettivi di risparmio, conti multipli, categorie e sottocategorie personalizzabili;
- spese divise (secondarie), analisi, regole di notifica locali, esportazione CSV/JSON e backup completo con ripristino;
- sicurezza: blocco biometrico, PIN facoltativo, blocco automatico, modalità privacy coerente in tutta l'app;
- sincronizzazione cloud facoltativa: in fase 1 solo schermate e stati, nessun server.

Vincoli:
- offline-first; dalla fase 2 SQLite locale come fonte di verità; l'interfaccia non dipende mai da Supabase o dal database;
- nessun segreto o credenziale nel codice;
- fuori dalla fase 1: autenticazione vera, backend, motore di sincronizzazione, banche/PSD2, OCR, IA, cambi valuta, notifiche di produzione, store.

Regole decise:
- importi in centesimi interi con codice valuta; valuta salvata per conto e per movimento; i totali sommano solo la valuta principale;
- spesa divisa: nelle statistiche conta solo la quota dell'utente, il resto diventa credito;
- saldo totale: somma dei conti con «incluso nel saldo totale» (di base tutti tranne il conto deposito);
- mese di budget dal giorno 1 (il modello prevede già un giorno di inizio diverso);
- trasferimenti mai contati come spesa; rimborsi riducono la spesa della categoria originale;
- confronto col mese precedente allo stesso giorno del mese.

Ancora da decidere: nome dell'app (candidati Stilla, Sereno, Kivo), licenza del codice, cifratura dei dati sincronizzati.

## Brand Commitments

- Nome non ancora scelto: nel codice resta in una sola costante.
- Riferimenti vincolanti dati dall'utente: Revolut, Apple Wallet, app iOS moderne, app fintech di fascia alta. Deve sembrare premium, minimale, elegante, veloce, calma; finanziaria ma non aziendale.
- Stessa identità visiva su iOS e Android; cambiano solo i comportamenti di sistema (fogli, gesto indietro, vibrazioni, aree sicure).
- Vetro (glassmorphism) leggero e solo in navigazione, elementi che galleggiano, sovrapposizioni, fogli inferiori e card selezionate; i contenuti restano sempre leggibilissimi.
- Da evitare per richiesta esplicita: estetica cyberpunk, neon, gradienti eccessivi, superfici di testo troppo trasparenti, cruscotti stile crypto, card generiche stile Bootstrap, aspetto da pannello di amministrazione.
- Tema chiaro e tema scuro entrambi curati; lo scuro non è un'inversione del chiaro.
- Voce: italiano semplice e calmo, niente allarmismi.

## Evidence on Hand

- Nessun dato reale: in fase 1 tutti i dati sono finti e vanno presentati come esempi.
- Nessun logo, marchio, immagine o testimonianza.
- Piano approvato il 07/10/2026: `docs/piano-fase-1.html`; decisioni in `docs/decisioni.md`.

## Product Principles

1. Cinque secondi: aprendo l'app si capisce il mese; tutto il resto viene dopo.
2. Tre tocchi per una spesa: importo, categoria, salva; il resto è facoltativo.
3. Il telefono è la casa dei dati: offline, senza costi fissi, cloud solo facoltativo.
4. Privacy di serie: blocco e modalità privacy coerenti ovunque.
5. Regole spiegabili: previsioni e avvisi deterministici e raccontati in app.

## Accessibility & Inclusion

- Contrasto WCAG AA in entrambi i temi (testo 4,5:1, elementi grafici 3:1).
- Bersagli di almeno 44 × 44 pt (48 dp su Android).
- Testo dinamico fino alle dimensioni per l'accessibilità, con layout che si riorganizza.
- Screen reader: icone con etichetta, importi letti per esteso, grafici con riassunto a parole; in modalità privacy si legge «importo nascosto».
- Lo stato finanziario non si affida mai al solo colore.
- Rispetto di «Riduci movimento» e «Riduci trasparenza».
