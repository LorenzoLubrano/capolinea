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

## 07/10/2026: sfondo della Home (riscontro alla Fermata 2)

- Su Android la Home piace; Lorenzo ha chiesto uno sfondo molto minimal perché non sembri statica.
- Proposte viste dal vivo sulla Home vera (artifact `BJaPkWNKUx1kb1rStd2Xi8`): Mappa, Reticolo, Luce. Scelte **Mappa** come predefinita e **Luce** da scegliere nelle impostazioni (Aspetto, passo 5). Reticolo scartato.
- Mappa: le prime quattro categorie del mese come linee parallele accanto al totale, con una stazione di interscambio. Si disegna una volta per avvio, scorre al 40% della pagina e svanisce nei primi 240 punti di scorrimento; la linea della categoria si accende quando si salva una spesa. Ferma il resto del tempo.
- Luce: tre aloni nei colori delle prime linee, con una deriva lenta che si ferma quando la Home non è in vista.
- Con «Riduci animazioni» niente disegno, deriva né parallasse (lo sfondo scorre con la pagina); l'accensione della linea resta, perché è solo opacità. Per i lettori di schermo lo sfondo non esiste. Mostra colori, mai importi.
- Skill di Skia trovate online e non installate: bastano `react-native-svg` e Reanimated, già nel progetto e in Expo Go.
- ESLint configurato da `expo lint` (`eslint.config.js`, versioni fissate); corretti i 2 errori del React Compiler che ha trovato in `month-band.tsx` e `spent-hero.tsx`.

## 08/10/2026: blocco Aggiungi (passo 5)

- Un solo modulo per spesa, entrata, trasferimento e rimborso (`movement-form.tsx`); l'abbonamento ha il suo, con modelli di esempio (nomi in testo, prezzi da controllare, niente loghi).
- Tipi di entrata: Stipendio, Rimborsi, Borsa di studio, Soldi ricevuti, Altre entrate. «Rimborsi» è un'entrata generica (per esempio dal datore di lavoro); il rimborso di un acquisto si registra dal dettaglio della spesa, è legato a quella spesa e ne riduce la categoria.
- Abbonamento con prossimo addebito nel passato: si creano subito gli addebiti già scaduti (stesso generatore idempotente dell'avvio), e l'avviso dice quanti.
- Divisione: parti uguali, importi o percentuali, con chi ha pagato; la quota di chi ha pagato è saldata per definizione. Si può aggiungere una persona al volo.
- Le date si scelgono da un calendario disegnato (stesso aspetto su iOS e Android, provabile sul web).
- Avvisi: sui telefoni i fogli sono finestre native sopra l'app, quindi ogni foglio ha il suo punto per gli avvisi; un avviso resta sul foglio che l'ha mostrato e, se quel foglio si chiude, passa a quello sotto.

## 08/10/2026: blocco Budget (passo 5)

- La scheda Budget ha tre viste alla pari, Mese, Abbonamenti e Obiettivi, cambiate sul posto senza scorrimento laterale.
- Budget valido in un mese: il più recente con «dal mese» non successivo. La proposta per un budget nuovo è la media dei mesi pieni precedenti, contando solo i mesi da quando ci sono movimenti.
- Ogni barra di budget ha la tacca del ritmo del mese; diventa rossa solo oltre il budget. Accanto: quanto resta e quanto si può spendere al giorno fino a fine mese.
- Abbonamenti: totale al mese e all'anno, calendario con i giorni di addebito, elenco. Sospendere ferma gli addebiti; riattivare riparte dal primo addebito da oggi, senza recuperare il periodo in pausa. Eliminare un abbonamento lascia i suoi addebiti tra i movimenti.
- Obiettivi: quota mensile per arrivare alla data scelta e arrivo previsto al ritmo dei versamenti degli ultimi tre mesi.

## 08/10/2026: blocco Analisi (passo 5)

- Periodo scelto con Settimana, Mese, Anno e le frecce per andare indietro, fino al periodo del primo movimento. Le schede di dettaglio usano lo stesso periodo.
- Una domanda per sezione, con la risposta a parole sotto: rispetto al solito, dove vanno i soldi, in quali giorni, da chi compro, spese più grandi, peso degli abbonamenti, come sono andati i budget. Tre grafici: barre del periodo, classifica delle categorie, puntini dei giorni. Il resto sono elenchi.
- «Il solito» è la mediana dei periodi precedenti (4 settimane, 3 mesi, 1 anno) sugli stessi giorni finora: la settimana con l'affitto non fa sembrare economiche tutte le altre. Sotto il 5% di differenza si dice «in linea». Più spesa del solito non è un errore: niente rosso.
- La linea tratteggiata del grafico è il periodo tipo intero («mese tipo»), la mediana dei periodi completi. I periodi prima del primo movimento non compaiono: niente dati non vuol dire zero spese.
- Giorni: puntini su una scala fissa (fino a 15 €, 15–40, 40–100, oltre 100), uguale in ogni periodo, con l'anello su oggi. Contano solo le spese variabili: affitto, bollette e abbonamenti cadono sempre negli stessi giorni e non dicono niente delle abitudini. Lo stesso vale per «le spese più grandi».
- Esercenti: il nome è testo libero, quindi maiuscole, accenti e spazi non contano; vale la grafia dell'ultimo acquisto. I rimborsi abbassano il totale ma non sono acquisti.
- Componenti nuovi condivisi: `BarChart` (usato anche dal dettaglio di categoria del Budget) e `LoadingBlocks`/`LoadError`.

## 08/10/2026: blocco Conti, categorie e spese condivise (passo 5)

- Conti, Categorie e Spese condivise si aprono dal Profilo (gruppo «I tuoi soldi»); in Home il saldo totale apre i Conti e, solo quando qualcuno deve qualcosa, compare la riga delle spese condivise.
- Correggere il saldo di un conto non crea movimenti finti: cambia il saldo di partenza, così il saldo di oggi è quello scritto.
- Un conto o una categoria si possono eliminare solo se niente li usa (movimenti, abbonamenti, budget, obiettivi); altrimenti si archiviano: spariscono dalle scelte e dal saldo totale, lo storico resta.
- Errore corretto: una spesa divisa pagata da un altro faceva scendere il tuo conto. Ora il conto cambia solo quando paghi tu.
- Pareggio: saldare con una persona segna saldate tutte le quote aperte tra voi e, se vuoi, registra il movimento sul conto. Quel movimento (`settlementWith`) muove il saldo ma non conta né nella spesa né nelle entrate, perché la tua quota era già contata con la spesa divisa. Si annulla dall'avviso.
- Dati di esempio: aggiunto un prelievo al mese sui contanti e un saldo di partenza più realistico per PayPal (prima andavano in rosso).
- Selettori di icona e colore promossi a componenti condivisi (`swatch-picker.tsx`), usati da obiettivi, conti e categorie.

## 08/10/2026: blocco Impostazioni (passo 5)

- Profilo in quattro gruppi: I tuoi soldi, Sicurezza e privacy, Preferenze, I tuoi dati; poi Info.
- Librerie aggiunte, tutte ufficiali Expo e incluse in Expo Go: `expo-local-authentication` (volto o impronta), `expo-crypto` (PIN), `expo-file-system` ed `expo-sharing` (esportazione), `expo-screen-capture` (anteprima nel multitasking). `npm audit` segnala vulnerabilità solo negli strumenti di build di Expo (erano già presenti; +1 moderata in `uuid`); niente arriva nell'app sul telefono e `npm audit fix --force` romperebbe le versioni di Expo.
- PIN: da 4 a 6 cifre; rifiutati quelli facili (cifre uguali, in fila, a coppie). Si salva solo un SHA-256 con sale casuale e si confronta in tempo costante. Nella fase 1 vive in memoria; nella fase 2 va in SecureStore. Per toglierlo o cambiarlo serve quello attuale. La biometria si attiva solo dopo una conferma riuscita, e la riserva è il PIN dell'app, non il codice del telefono.
- Anteprima nel multitasking coperta di base: su iOS sfocata, su Android finestra protetta, che blocca anche gli screenshot dell'app (si può spegnere in Privacy).
- Esportazione: CSV per Excel e Numbers in italiano (punto e virgola, virgola decimale, BOM UTF-8), con le celle di testo protette dalle formule (CSV injection); backup completo in JSON con formato e versione. Il file passa dalla cache privata dell'app e viene cancellato alla prossima esportazione o al prossimo avvio: non lo si cancella subito perché l'app che lo riceve potrebbe ancora leggerlo.
- Notifiche: regole locali con soglie e un'anteprima di come arrivano; con la privacy attiva nessuna cifra, nemmeno le percentuali. Nel prototipo non partono.
- Sincronizzazione: concept con i sei stati simulati (accesso finto, nessun server); offline, errore e conflitto si vedono dal pannello prototipo, che per ora ha solo questa parte.
- Elimina dati locali: conferma scritta «ELIMINA» al posto dell'Annulla, perché non si torna indietro. Si riparte dalle categorie predefinite e da Contanti a zero; si perdono anche PIN e accesso alla sincronizzazione, l'aspetto resta. Le categorie predefinite ora stanno in `src/data/defaults.ts`, non nei dati di esempio.
