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

## 08/10/2026: blocco Onboarding e blocco (passo 5)

- Onboarding in 5 schermate: Benvenuto (con «Ripristina da un backup»), Valuta, Primo conto, Budget del mese, Privacy; i passi sono una linea con le fermate. Saltando il conto si crea «Contanti» a zero; il budget si può saltare. Alla fine la Home vuota indica il +.
- L'app e l'onboarding sono separati da rotte protette (`Stack.Protected` con `onboarded`): eliminare i dati o «Rivedi il primo avvio» nel pannello riportano all'onboarding da soli. I dati vuoti non hanno più un conto: lo crea l'onboarding.
- Blocco: dopo il tempo scelto in secondo piano la schermata di blocco si apre sopra tutto, fogli compresi, e allo sblocco si torna dov'eri. Niente importi sulla schermata; il volto o l'impronta partono subito se attivi, il PIN resta sempre. Il tasto indietro di Android non la chiude. «Blocca adesso» in Sicurezza.
- Tentativi: dopo 4 PIN sbagliati si aspetta 30 secondi, poi 1, 2, 5, 10 e infine 15 minuti: con 10.000 combinazioni indovinare diventa impraticabile. Il PIN in memoria si perde chiudendo l'app, quindi nella fase 1 il blocco si vede solo tornando dal secondo piano.
- Ripristino: il file non è mai creduto sulla parola. Prima la dimensione (20 MB al massimo, controllata prima di leggerlo), poi JSON, formato e versione, poi ogni record contro il suo schema e ogni riferimento contro i record; si tengono solo i campi noti, così niente di estraneo entra nei dati. Anteprima con conteggi e date; se il telefono ha già dati serve scrivere «SOSTITUISCI», da vuoto no.

## 08/10/2026: blocco Pannello prototipo (passo 5)

- Solo in sviluppo: la voce in Info e la rotta esistono solo con `__DEV__`, quindi in una build di rilascio il pannello non si apre nemmeno con un link.
- Dati di esempio: pieni; senza entrate (lo stipendio passa nel saldo iniziale, così i saldi di oggi restano uguali e cambia solo l'assenza di entrate); casi limite (nomi lunghissimi, un saldo oltre il milione e uno sotto zero, 1 centesimo e 49.999,99 €, venti movimenti oggi, una cena divisa in otto, budget sforati o usati al centesimo, rimborsi più grandi della spesa, obiettivi raggiunti, superati o in ritardo). Il primo avvio resta la voce a parte che porta all'onboarding.
- Data di oggi: 24 ottobre 2026, 1 ottobre, 31 ottobre oppure la data vera. Cambiare dati o data rigenera tutto; quello che si era aggiunto si perde.
- Lentezza ed errori: un involucro attorno ai repository (`withFaults`) rallenta ogni chiamata di 2 secondi o fa fallire le letture, e vale per qualunque implementazione, anche per SQLite nella fase 2. «Ricarica e torna alla Home» dimentica i dati già letti, così si vedono il caricamento o l'errore.
- Trovato provando il pannello: con i dati non ancora letti Movimenti andava in errore, perché il React Compiler memorizza `data?.categories.map(...)` e `data!.currency` come se `data` ci fosse sempre. Corretto con ternari espliciti, anche nel menu +. Oggi non si vedeva solo perché la Home carica sempre per prima.
- I dati di esempio non mettono più versamenti degli obiettivi dopo la data di oggi (prima, con una data anteriore all'11 ottobre, comparivano versamenti futuri).

## 08/10/2026: Fermata 3, verifica e rifinitura

Critica di impeccable (due revisioni isolate, 28/40) e controllo tecnico per app native (12/20); scelte di Lorenzo sulle quattro domande: tutte le opzioni consigliate.

- Stato del budget dalla previsione, non dal ritmo lineare: giallo solo se l'arrivo previsto supera il capolinea o ci arriva entro il 5%. Le spese fisse di inizio mese non fanno più scattare avvisi. Una sola lingua per Home e Budget: Nei tempi, Arrivo vicino al capolinea, Arrivo oltre il capolinea, Al capolinea, Oltre il capolinea. La soglia di Notifiche resta per le notifiche.
- Inserimento: il + apre subito Nuova spesa, con Spesa, Entrata e Trasferimento in alto (si cambia tipo tenendo importo, conto e data); Recenti e Abbonamento dentro il foglio; «Un'altra» salva e tiene aperto il foglio; un tocco per Ieri; data e conto dell'ultimo salvataggio proposti per mezz'ora. Tolto il menu del + e la pressione lunga.
- Linee: nel quadrato della categoria c'è la sua icona (prima l'iniziale, con quattro «S»). Il quadrato smaltato è solo delle categorie: i conti sono gettoni rotondi neutri con l'anello del loro colore, gli obiettivi un'icona su fondo neutro. In scuro le linee scure sono schiarite fino a 3:1; icone e nomi in nero dove il bianco non arrivava a 4,5:1; il giallo in chiaro ha un bordo.
- Firma: Budget › Mese mostra la fascia della Home; le barre restano nel colore della linea fino al capolinea e solo l'eccesso è rosso; gli obiettivi sono una linea verso il capolinea con una fermata per versamento (tolto l'anello).
- Accessibilità: annunci per VoiceOver (su Android restano le live region); toast con Annulla di 15 secondi con lo screen reader; importi letti con la direzione e «importo nascosto» in privacy ovunque; grigio terziario a 4,5:1; chip e segmenti alti 44 e 48 dp su Android; righe delle impostazioni lette una volta.
- Robustezza: i fogli con dati scritti non si chiudono per sbaglio e chiedono prima di scartare (solo sul telefono: il web non ha l'avviso nativo).
- Adattamento: Benvenuto, Blocco e PIN scorrono; cifre e righe si riorganizzano col testo grande; tastiera che non copre i campi su iOS; fascia sotto la barra di stato nelle schede. Su Android la tastiera resta affidata al ridimensionamento della finestra: da provare sul S24.
- Casi limite: confronti oltre il doppio in «volte»; obiettivi con data passata; rimborsi oltre la spesa mostrati a parte; nomi della fascia fuori dalla tacca «oggi»; fogli di Analisi limitati a 20 movimenti con il link a Movimenti filtrato.
- Movimento e revisioni finali: «Riduci animazioni» letto dal vivo (anche cambiato ad app aperta), l'impulso della linea e le dissolvenze restano anche con le animazioni ridotte, schermate spinte in dissolvenza; il toast di un foglio che si chiude compare una volta sola, sulla schermata sotto, e mai sopra la schermata di blocco. Obiettivi in ritardo segnalati quando il ritmo degli ultimi tre mesi arriva dopo la data; fermate degli obiettivi distanziate; cifre grandi meno strette, perché il punto delle migliaia resti leggibile. Il link «Tutti i N movimenti» apre Movimenti sullo stesso periodo dell'analisi (filtro con date esatte).

Seconde scelte di Lorenzo, dopo la consegna della Fermata 3:

- Linee delle categorie: niente più tacca del ritmo costante, che contraddiceva l'avviso; l'arrivo previsto è un tratteggio come nella fascia del mese, e se supera il budget compare il capolinea. L'anello «oggi» della fascia resta il ritmo costante.
- La fascia del mese si muove quando il foglio di inserimento si è chiuso (Home e Budget tengono i valori finché sono coperti, poi 300 ms): dopo una serie di «Un'altra» si vede un solo spostamento. Le altre animazioni proposte (obiettivo che si riempie, PIN che scuote, rullo del totale, linea dell'onboarding) restano fuori.
- Home vuota: se il primo avvio ha impostato un budget, la fascia c'è già, vuota e col capolinea. Il + si indica una volta sola.
