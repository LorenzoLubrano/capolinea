---
name: Capolinea
description: Spese personali come una linea della metropolitana di Milano; il mese è una fascia che si percorre, il budget è il capolinea.
colors:
  background: "#FAFAF8"
  surface: "#FFFFFF"
  surface-muted: "#F0EFEB"
  selection: "#FFFFFF"
  ink: "#111111"
  ink-secondary: "#5F5F5B"
  ink-tertiary: "#6B6B66"
  on-ink: "#FFFFFF"
  hairline: "rgba(17, 17, 17, 0.10)"
  track: "#E8E7E2"
  alert: "#C8141B"
  warning: "#8F5A00"
  glass: "rgba(250, 250, 248, 0.78)"
  glass-border: "rgba(17, 17, 17, 0.08)"
  scrim: "rgba(17, 17, 17, 0.24)"
  background-dark: "#0D0D0E"
  surface-dark: "#17171A"
  surface-muted-dark: "#202024"
  selection-dark: "#3A3A40"
  ink-dark: "#F4F4F1"
  ink-secondary-dark: "#A3A39E"
  ink-tertiary-dark: "#8A8A83"
  on-ink-dark: "#0D0D0E"
  hairline-dark: "rgba(255, 255, 255, 0.10)"
  track-dark: "#26262A"
  alert-dark: "#FF5A52"
  warning-dark: "#F2B54A"
  glass-dark: "rgba(23, 23, 26, 0.72)"
  glass-border-dark: "rgba(255, 255, 255, 0.10)"
  scrim-dark: "rgba(0, 0, 0, 0.50)"
  line-green: "#0B9C55"
  line-yellow: "#F2B315"
  line-yellow-edge: "#B98500"
  line-blue: "#1C5DAE"
  line-lilac: "#8E5BB5"
  line-sky: "#2A93C9"
  line-magenta: "#C2337A"
  line-orange: "#E07010"
  line-teal: "#0E8A8A"
  line-indigo: "#3F4AB0"
  line-olive: "#6E8B1F"
  line-brown: "#8A5A2B"
  line-slate: "#4A6378"
  line-pink: "#D9679A"
  line-plum: "#7A2E5E"
  line-grey: "#8C8C88"
  line-blue-dark: "#4A86DA"
  line-indigo-dark: "#7380DC"
  line-magenta-dark: "#D9508F"
  line-brown-dark: "#B07A45"
  line-slate-dark: "#6E8AA2"
  line-plum-dark: "#C0609A"
typography:
  display:
    fontFamily: "Archivo Narrow"
    fontSize: "54px"
    fontWeight: 700
    lineHeight: "58px"
    letterSpacing: "-0.8px"
    fontFeature: "tnum"
  display-cents:
    fontFamily: "Archivo Narrow"
    fontSize: "28px"
    fontWeight: 600
    lineHeight: "34px"
    letterSpacing: "-0.4px"
    fontFeature: "tnum"
  amount-input:
    fontFamily: "Archivo Narrow"
    fontSize: "64px"
    fontWeight: 700
    lineHeight: "70px"
    letterSpacing: "-1px"
    fontFeature: "tnum"
  figure:
    fontFamily: "Archivo Narrow"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "26px"
    letterSpacing: "-0.4px"
    fontFeature: "tnum"
  title1:
    fontFamily: "Archivo"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "36px"
    letterSpacing: "-0.6px"
  title2:
    fontFamily: "Archivo"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "-0.3px"
  title3:
    fontFamily: "Archivo"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: "22px"
    letterSpacing: "-0.1px"
  body:
    fontFamily: "Archivo"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "22px"
  body-strong:
    fontFamily: "Archivo"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "22px"
    fontFeature: "tnum"
  callout:
    fontFamily: "Archivo"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "20px"
  subhead:
    fontFamily: "Archivo"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "19px"
  subhead-strong:
    fontFamily: "Archivo"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "19px"
    fontFeature: "tnum"
  footnote:
    fontFamily: "Archivo"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  caption:
    fontFamily: "Archivo"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
  badge:
    fontFamily: "Archivo"
    fontSize: "13px"
    fontWeight: 800
    lineHeight: "16px"
  tab:
    fontFamily: "Archivo"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "13px"
  key:
    fontFamily: "Archivo"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: "32px"
    fontFeature: "tnum"
rounded:
  badge: "6px"
  sign: "7px"
  key: "12px"
  control: "14px"
  card: "20px"
  sheet: "28px"
  full: "9999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  smd: "12px"
  md: "16px"
  gutter: "20px"
  lg: "24px"
  xl: "32px"
  xxl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "56px"
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "52px"
  button-destructive:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.alert}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "52px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead-strong}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.subhead-strong}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "44px"
  segmented:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink-secondary}"
    typography: "{typography.subhead-strong}"
    rounded: "{rounded.control}"
    padding: "3px"
    height: "44px"
  segmented-selected:
    backgroundColor: "{colors.selection}"
    textColor: "{colors.ink}"
    typography: "{typography.subhead-strong}"
    rounded: "11px"
  tab-bar-add:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    rounded: "{rounded.control}"
    width: "56px"
    height: "48px"
  line-badge:
    rounded: "{rounded.badge}"
    size: "26px"
  settings-group:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
  toast:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.callout}"
    rounded: "{rounded.control}"
    padding: "0 4px 0 16px"
    height: "52px"
  pin-key:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.ink}"
    typography: "{typography.key}"
    rounded: "{rounded.full}"
    size: "76px"
---

# Design System: Capolinea

<!-- Scritto dal prototipo della fase 1 (08/10/2026). Fonte dei token: src/theme/tokens.ts e src/theme/colors.ts. Se il codice cambia, il codice vince: si aggiorna questo file. -->

## Overview

**Creative North Star: "La linea che percorri"**

Il mese è una linea della metropolitana. Il mondo è la segnaletica di Bob Noorda per la Metropolitana di Milano (1964): bianco smalto e nero stazione, un solo grottesco, le categorie come linee di colore saturo, il budget come capolinea. Una fascia continua divisa per categoria dice quanta strada ha fatto la spesa, dove dovrebbe essere oggi (l'anello) e dove arriverà a fine mese (il tratteggio). Il resto dell'app ripete gli stessi segni: barre di budget come linee verso il capolinea, obiettivi come linee con le fermate, movimenti come fermate lungo una linea.

La densità è quella di un'app iOS moderna: una colonna larga come un telefono (al massimo 480), righe separate da filetti, pochi blocchi pieni. Il colore saturo appartiene solo alle categorie; tutto il resto è inchiostro su smalto, così una categoria si impara una volta e si riconosce ovunque. Il vetro sta solo dove le cose galleggiano (barra delle schede, toast); i contenuti stanno su superfici piene. Il movimento è breve, in uscita morbida, e si ferma: niente animazioni in ciclo sui contenuti.

Rifiuti confermati dal proprietario (PRODUCT.md): estetica cyberpunk e neon, gradienti eccessivi, superfici di testo troppo trasparenti, cruscotti stile crypto, card generiche stile Bootstrap, aspetto da pannello di amministrazione. Il tema scuro è curato a parte, non è un'inversione del chiaro.

**Key Characteristics:**
- Fascia del mese a segmenti di categoria, tratteggio di previsione, anello «oggi», barra di capolinea in inchiostro.
- Un solo inchiostro (`ink`) per azioni, selezioni e segni di riferimento; colori saturi solo per le categorie.
- Rosso (`alert`) solo oltre il capolinea e per le azioni distruttive.
- Archivo per il testo, Archivo Narrow con cifre tabellari per gli importi.
- Lo stato si legge sempre da forma e parole, oltre che dal colore.

## Colors

Smalto e inchiostro, con quindici colori di linea saturi riservati alle categorie e due colori di stato usati con parsimonia. Ogni colore ha una coppia chiara e scura risolta da `useTheme()` in `src/theme/index.ts`.

### Primary
- **Inchiostro stazione** (`ink`, scuro `ink-dark`): l'unico colore d'azione. Pulsante principale, + della barra, chip e giorno selezionati, barra di capolinea, anello e stelo di «oggi», filetto di 2 pt sopra il saldo totale, icona della scheda attiva. Su inchiostro si scrive con `on-ink`.

### Secondary
- **Colori di linea** (`line-*`): le categorie, come i cartelli delle linee. Si usano pieni nella fascia del mese, nei `LineBadge`, nelle `ProgressLine`, sulle linee della mappa di sfondo, come anello delle fermate in `StopRow`. Ogni linea ha il suo colore di primo piano `on` (`#111111` o `#FFFFFF`, sempre almeno 4,5:1) per icona e nome sopra il pieno. Il giallo in chiaro ha un bordo `line-yellow-edge` dove toccherebbe il binario. In scuro sei linee (blu, indaco, magenta, marrone, ardesia, prugna) sono schiarite fino a 3:1 sullo sfondo e sul binario (`line-*-dark`) e portano icone e nomi in nero.

### Tertiary
- **Rosso avviso** (`alert`, scuro `alert-dark`): l'eccesso oltre il capolinea nelle barre, «Oltre il capolinea», importi sforati, errori del PIN, azioni distruttive.
- **Ocra attenzione** (`warning`, scuro `warning-dark`): previsione vicina o oltre il capolinea, «Al capolinea», attesa dopo troppi PIN sbagliati. In chiaro è un ocra scuro leggibile come testo, non un giallo.

### Neutral
- **Bianco smalto** (`background`) / **Nero stazione** (`background-dark`): fondo di ogni schermata.
- **Superficie** (`surface`, `surface-dark`): gruppi delle impostazioni, chip non selezionati, fondo di vetro con «Riduci trasparenza».
- **Superficie tenue** (`surface-muted`, `surface-muted-dark`): pulsanti secondari, binario dei segmenti, tasti del PIN, gettoni dei conti e fondi degli obiettivi.
- **Selezione** (`selection`, `selection-dark`): il segmento scelto, più chiaro del binario in entrambi i temi.
- **Inchiostro secondario e terziario** (`ink-secondary`, `ink-tertiary` e scuri): etichette, note, assi. Il terziario resta 4,5:1 su ogni superficie anche a corpo piccolo. `ink-secondary` disegna anche ogni tratteggio di previsione.
- **Binario** (`track`, `track-dark`): il fondo vuoto di fascia, barre e obiettivi; anche i blocchi di caricamento.
- **Filetto** (`hairline`, `hairline-dark`): separatori di riga e linea che unisce le fermate.
- **Vetro, bordo del vetro, velo** (`glass`, `glass-border`, `scrim` e scuri): solo per elementi che galleggiano e sovrapposizioni.

### Named Rules
**The Red Terminus Rule.** Il rosso compare solo oltre il capolinea e nelle azioni distruttive. Nessuna categoria usa il rosso; spendere più del solito non è un errore e non diventa rosso; una barra resta nel colore della sua linea fino al capolinea e solo l'eccesso è rosso.

**The Enamel Square Rule.** Il quadrato smaltato pieno appartiene solo alle categorie. I conti sono gettoni rotondi neutri (`surface-muted`) con l'anello del loro colore; gli obiettivi sono un'icona su fondo rotondo neutro. Un conto non deve mai sembrare una linea.

**The One Ink Rule.** Selezione e azione principale sono sempre inchiostro pieno con testo `on-ink`, mai un colore di linea.

**The Opaque Mix Rule.** I disegni tenui (la mappa di sfondo) usano `mix()` di `colors.ts`, un colore opaco precalcolato, invece della trasparenza, così le forme che si toccano non si scuriscono a vicenda.

## Typography

**Display Font:** Archivo Narrow (Bold 700, SemiBold 600), solo per le cifre
**Body Font:** Archivo (400, 500, 600, 700, 800)

**Character:** Un solo grottesco, come la segnaletica: Archivo pieno per le parole, la sua versione stretta e pesante per gli importi, sempre con cifre tabellari (`tabular-nums`) perché le colonne di numeri restino allineate. I font statici portano il peso nel nome (`fonts.*` in `tokens.ts`); ogni testo passa da `AppText` con una variante di `type` e un tono del tema.

### Hierarchy
- **Display** (`display`, Archivo Narrow 700, 54/58, -0,8): il totale «Speso a ottobre» in Home. I centesimi e la valuta scendono a `displayCents` (600, 28/34) tramite `Money` con `centsVariant`.
- **Amount input** (`amountInput`, Archivo Narrow 700, 64/70, -1): l'importo mentre lo si scrive nel foglio di inserimento.
- **Figure** (`figure`, Archivo Narrow 700, 22/26, -0,4): importi in evidenza dentro le sezioni, come il saldo totale.
- **Title** (`title1` 30/36, `title2` 22/28, `title3` 17/22, Archivo 700): titoli di schermata, di foglio e di sezione («La fascia del mese», «Le tue linee»).
- **Body** (`body` 400 e `bodyStrong` 600 tabellare, 16/22): righe e importi di riga.
- **Callout / Subhead / Footnote** (`callout` 500 15/20, `subhead` 400 e `subheadStrong` 600 14/19, `footnote` 400 13/18): azioni testuali dei fogli, righe secondarie, stato e note.
- **Label** (`caption` 600 12/16, `badge` 800 13/16, `tab` 600 11/13): nomi dentro la fascia, etichetta «oggi», assi dei grafici, schede.
- **Key** (`key`, Archivo 500, 26/32, tabellare): tasti del PIN e del tastierino.

### Named Rules
**The Tabular Money Rule.** Ogni importo esce da `Money`, in una variante tabellare. Nessun importo si scrive a mano in un testo: è `Money` che applica la privacy e legge l'importo per esteso ai lettori di schermo.

**The Two Faces Rule.** Archivo Narrow solo per le cifre; le parole sono sempre Archivo. Gerarchia per corpo e peso, non per famiglie diverse.

## Layout

Una colonna sola, al massimo `layout.maxContentWidth` (480) e centrata su iPad e web, con margini laterali `spacing.gutter` (20). La griglia è a 4 punti (`spacing`, da `xxs` 2 a `xxl` 48): distanza tra righe < distanza tra gruppi < distanza tra sezioni. Le schede lasciano sotto lo spazio della barra (`layout.tabBarHeight`, 64, più l'area sicura) e in alto una fascia del colore di fondo che compare scorrendo, sotto la barra di stato.

Le liste sono righe separate da filetti, non pile di card: `StopRow` alta almeno 60, righe delle linee con `spacing.smd` sopra e sotto, gruppi delle impostazioni su una superficie unica con filetti rientrati di `spacing.md`. Ogni bersaglio è alto almeno 44 pt; su Android `PressableScale` aggiunge un `hitSlop` di 2 per arrivare a 48 dp senza crescere a schermo. Con il testo grande cifre e righe passano da affiancate a impilate (`useLargeText`). Durante il caricamento restano i blocchi della forma finale nel colore `track` (raggio `sign`), mai uno spinner.

## Elevation & Depth

Sistema piatto: la profondità viene dai toni (fondo, superficie, superficie tenue) e dal vetro, non dalle ombre. Esiste una sola ombra, morbida e ambientale, per ciò che galleggia sopra il contenuto.

### Shadow Vocabulary
- **Galleggiante** (`shadows.floating`: `0 8px 24px rgba(0, 0, 0, 0.10)`): toast, segmento selezionato, anteprima della notifica.

### Glass
`Glass` in `src/components/glass.tsx`: su iOS 26 Liquid Glass, su iOS precedente e web sfocatura di sistema (intensità 60) sopra `glass`, su Android superficie piena (`surface`) senza sfocatura. Con «Riduci trasparenza» sempre superficie piena. Si usa per la barra delle schede (agganciata in basso, bordo superiore `glass-border`) e per i toast. I fogli sono `formSheet` nativi con raggio 28.

### Named Rules
**The Float-Only Glass Rule.** Vetro e ombra solo per ciò che galleggia (barra, toast, segmento scelto). Righe, importi e grafici stanno sempre su superfici piene; sul vetro vanno solo etichette brevi come quelle delle schede e del toast.

## Shapes

Angoli continui (`borderCurve: 'continuous'`) e raggi presi dalla segnaletica: piccoli e netti per cartelli e linee, più ampi per i controlli, pieni per tutto ciò che è un gettone o una fermata.

- **Cartello** (`radius.sign`, 7): la fascia del mese, i blocchi di caricamento.
- **Badge** (`radius.badge`, 6): il quadrato smaltato delle categorie, le barre dei grafici.
- **Tasto** (`radius.key`, 12): tasti del tastierino e selettori di colore e icona.
- **Controllo** (`radius.control`, 14): pulsanti, + della barra, controllo segmentato (il segmento interno ha 11), toast, campo di ricerca.
- **Card** (`radius.card`, 20): gruppi delle impostazioni e poche superfici di dettaglio.
- **Foglio** (`radius.sheet`, 28): angoli dei fogli inferiori.
- **Pieno** (`radius.full`): chip, linee di progresso, gettoni dei conti, fondi degli obiettivi, tasti del PIN, giorni del calendario.

Segni ricorrenti: anello con fondo `background` e bordo 3 (fermate, «oggi», puntini di onboarding); barra di capolinea in inchiostro larga 3 con raggio 2, più alta della linea che chiude; tratteggio aperto a sinistra con bordo 2 (1 sulle linee sottili) per ogni previsione.

## Components

### Buttons
Tattili e sobri; uno solo pieno per schermata.
- **Shape:** angoli continui da controllo (14).
- **Primary:** inchiostro pieno, testo `on-ink` in `bodyStrong`, alto 56, icona in grassetto.
- **Secondary:** `surface-muted` con testo inchiostro, alto 52.
- **Destructive:** `surface-muted` con testo `alert`, alto 52; il toast con «Annulla» sostituisce la conferma.
- **Stacked:** icona sopra l'etichetta, alto 64, per file di azioni alla pari su schermi stretti.
- **Press:** `PressableScale` alla pressione, scala 0,97 in `motion.press` (120 ms) con `easeOut`; righe e tasti usano `feedback="dim"` (opacità 0,6). Con «Riduci animazioni» solo opacità. Disattivato: opacità 0,4.

### Chips
- **Style:** pillola alta almeno 44, larga almeno 56, fondo `surface`, bordo `hairline` da 1, testo `subheadStrong`.
- **State:** selezionato diventa inchiostro pieno con testo `on-ink` e bordo inchiostro. Usati per filtri, categorie, conti.

### Segmented
Da due a quattro viste alla pari della stessa schermata. Binario `surface-muted` con 3 di imbottitura; il segmento scelto è `selection` con bordo `glass-border` e ombra galleggiante, così la scelta non si affida al solo colore del testo. Cambiare non scorre: il contenuto cambia sul posto, con una vibrazione di selezione.

### Cards / Containers
- **Corner Style:** card (20).
- **Background:** `surface` su fondo `background`.
- **Shadow Strategy:** nessuna, salvo l'anteprima della notifica (vedi Elevation & Depth).
- **Border:** nessuno; dentro, filetti `hairline` rientrati.
- **Internal Padding:** `spacing.md` (16).

### Inputs / Fields
- **Importo:** `amountInput` grande, con tastierino a tasti `radius.key`.
- **PIN:** `PinPad` a tasti rotondi da 76 su `surface-muted`, cancella trasparente, niente virgola; `PinDots` ad anelli inchiostro da 14 che si riempiono, mai le cifre.
- **Calendario:** `Calendar` disegnato uguale su iOS e Android; giorni in cerchi da 36, scelto inchiostro pieno, oggi anello inchiostro da 1,5, fino a tre puntini da 5 nel colore di linea per i giorni con addebiti.

### Navigation
- **Barra delle schede:** `LineTabBar`, vetro agganciato in basso, uguale su iOS e Android. Quattro schede (Home, Movimenti, Budget, Analisi) con icone da 24, piene in inchiostro se attive, regolari in `ink-secondary` se no, etichette `tab`. Al centro il +: rettangolo inchiostro 56 × 48 a raggio controllo, che apre subito Nuova spesa con una vibrazione leggera.
- **Fogli:** `formSheet` nativi a raggio 28; `SheetHeader` con un'azione testuale `callout` per lato (larga almeno 80) e il titolo `title3` al centro.

### Month Band (firma)
`MonthBand` in `src/features/home/month-band.tsx`. Fascia alta 32 a raggio `sign` sul binario, con sopra 20 per l'etichetta. Segmenti delle categorie nel loro colore di linea, con il nome in `caption` e colore `on` solo se ci sta (e fuori dallo stelo di «oggi»). Il tratteggio di previsione prolunga la fascia fino all'arrivo previsto, bordo 2 in `ink-secondary`. L'anello «oggi» (16, bordo 3 inchiostro, fondo `background`) con il suo stelo da 2 segna il ritmo costante del mese, con l'etichetta che passa a sinistra oltre il 75%. La barra di capolinea in inchiostro (3 × 40) compare solo quando la previsione o la spesa superano il budget e la scala si allunga. Sotto: «Restano» (o lo sforamento in rosso con icona), la legenda del tratteggio con la previsione e la `StatusLine`. In Budget › Mese torna in forma `compact`. I segmenti si muovono su `left` e `width` in `motion.slow` (400) con `easeOut`, dopo `motion.afterSheet` (300): una serie di «Un'altra» produce un solo spostamento, a foglio chiuso. Per i lettori di schermo è un'immagine con il riassunto a parole.

### Progress Line, Goal Line
- **`ProgressLine`:** linea a raggio pieno (6 di base, 4 in Home, 8 nel dettaglio) sul binario, piena nel colore della categoria fino al capolinea; oltre, la scala si allunga, la barra di capolinea inchiostro segna il budget e solo l'eccesso è `alert`. La previsione è lo stesso tratteggio della fascia. Il giallo usa il bordo `edge`.
- **`GoalLine`:** linea verso il capolinea nel colore dell'obiettivo, una fermata ad anello per versamento (distanziate da `spacedStops` perché non diventino una catena), barra di capolinea inchiostro a destra. `GoalBadge`: icona su fondo rotondo `surface-muted`, spunta quando è raggiunto.

### Status Line
`StatusLine`: icona, parole e colore insieme. Il vocabolario è unico per Home e Budget (`it.budget.statusWords`): **Nei tempi** (spunta, `ink-secondary`), **Arrivo vicino al capolinea**, **Arrivo oltre il capolinea**, **Al capolinea** (avviso, `warning`), **Oltre il capolinea** (avviso, `alert`). Lo stato nasce dalla previsione, non dal ritmo lineare. Dove la riga sopra dice già lo sforamento in rosso, la `StatusLine` non si ripete.

### Line Badge, Account Badge
- **`LineBadge`:** quadrato smaltato da 26 a raggio `badge`, pieno del colore di linea, con l'icona della categoria in grassetto al 60% e nel colore `on`. Solo categorie.
- **`AccountBadge`:** gettone rotondo da 32 su `surface-muted`, anello da 2,5 nel colore del conto, icona del tipo di conto in inchiostro.

### Stop Row
`StopRow`: un movimento come fermata. Anello da 14 (bordo 3) nel colore della categoria, grigio `ink-tertiary` per i trasferimenti; un filetto da 2 unisce le fermate dello stesso giorno. Titolo `bodyStrong`, sottotitolo `footnote`, importo con segno a destra e la propria quota sotto se la spesa è divisa.

### Money
`Money` è l'unica via per mostrare un importo: formato italiano (`1.284,62 €`), privacy applicata ovunque (`••••`, letto «importo nascosto»), lettura per esteso con la direzione per i lettori di schermo, testo che si restringe fino a 0,6 invece di andare a capo.

### Toast
`ToastHost`: vetro a raggio controllo con bordo `glass-border` e ombra galleggiante, alto almeno 52, testo `callout` e azione `subheadStrong` (per esempio «Annulla»). Sopra la barra sale dal basso in `motion.base` (250) e scende in 200; nei fogli e con «Riduci animazioni» entra in dissolvenza in `motion.fast` (150) ed esce in 120. Resta 5 secondi, 15 con il lettore di schermo e un'azione. Mai sopra la schermata di blocco.

### Bar Chart
`BarChart`: barre a raggio `badge`; quella in evidenza nel colore della categoria, le altre in `ink-tertiary` (3:1 sul fondo), la toccata in `ink-secondary`. Previsione come contorno tratteggiato da 1,5 nel colore, riferimento («mese tipo») come regola tratteggiata in inchiostro. Selezionabile con le azioni di accessibilità, con un trattino inchiostro sotto l'etichetta scelta.

### Home Backdrop
`HomeBackdrop`: decorazione dietro il totale, mai importi, invisibile ai lettori di schermo. **Mappa** (predefinita): le prime categorie come linee parallele (passo 9, tratto 7, a 116 dal bordo alto del contenuto) con una stazione di interscambio, intensità 0,2 in chiaro e 0,32 in scuro; si disegna una volta per avvio (900 ms, 90 ms tra una linea e l'altra, interscambio dopo 650 in 300), scorre al 40% della pagina e svanisce nei primi 240; la linea della categoria salvata si accende (0,7, 225 in entrata, 675 in uscita) dopo `afterSheet`. **Luce** (in Aspetto): tre aloni radiali nei colori delle prime linee (0,32 / 0,26 / 0,20 in chiaro, 0,42 / 0,32 / 0,22 in scuro), deriva lenta di 19, 23 e 27 secondi, ferma quando la Home non è in vista.

### Motion
- **Durate:** `press` 120, `fast` 150, `base` 250, `slow` 400, `afterSheet` 300 (quanto aspetta lo schermo sotto prima di muoversi dopo un foglio).
- **Curve:** `easeOut` `cubic-bezier(0.23, 1, 0.32, 1)` (con `easeOutTiming` per i worklet) per quasi tutto; `easeInOut` `cubic-bezier(0.77, 0, 0.175, 1)` disponibile.
- **Riduci animazioni:** letto dal vivo. Niente scala alla pressione, disegno della mappa, deriva né parallasse; spostamenti a durata 0; restano le dissolvenze e l'accensione della linea, che sono solo opacità.
- **Vibrazioni:** una sola per azione, nello stesso fotogramma del segno visivo e mai unico riscontro (`services/haptics.ts`): `selection` per un valore che scatta, `light` per il + e i cambi leggeri, `medium` per le eliminazioni, `success` e `warning` per gli esiti.

## Do's and Don'ts

### Do:
- **Do** passare ogni colore da `useTheme()` e ogni categoria da `lineColor(key)`, così la versione scura delle linee arriva da sola.
- **Do** disegnare ogni stato con forma e parole oltre al colore: pieno per lo speso, tratteggio per la previsione, anello per oggi, barra inchiostro per il capolinea, `StatusLine` per le parole.
- **Do** usare il tratteggio in `ink-secondary` per ogni previsione, nella fascia, nelle barre e nei grafici.
- **Do** far passare ogni importo da `Money` e ogni testo da `AppText` con una variante di `type`.
- **Do** tenere i bersagli ad almeno 44 pt (48 dp su Android) e il contrasto a 4,5:1 per il testo e 3:1 per i segni.
- **Do** far aspettare `motion.afterSheet` (300) a ciò che cambia sotto un foglio, così il movimento si vede a foglio chiuso.

### Don't:
- **Don't** usare il rosso per una categoria, per «più del solito» o per la parte di una barra che sta prima del capolinea.
- **Don't** dare il quadrato smaltato a conti o obiettivi: i conti sono gettoni neutri con l'anello, gli obiettivi icone su fondo neutro.
- **Don't** mettere vetro o trasparenza sotto righe, importi e grafici; il vetro è solo per barra, toast e ciò che galleggia.
- **Don't** usare gradienti su superfici, pulsanti o card (l'unico gradiente è l'alone tenue dello sfondo Luce), né neon, estetica cyberpunk o da cruscotto crypto, card generiche stile Bootstrap o un aspetto da pannello di amministrazione.
- **Don't** mostrare importi nella decorazione di sfondo o sulla schermata di blocco.
- **Don't** far partire più di una vibrazione per azione, né animazioni in ciclo sui contenuti (la sola deriva continua è quella degli aloni di Luce, ferma fuori dalla Home e con «Riduci animazioni»).

## Logo

Il segno di Capolinea è la fascia del mese che finisce in una moneta: tre linee di categoria (`line-blue`, `line-green`, `line-orange`) sul binario, l'anello «oggi» con il suo stelo e, al posto della barra del capolinea, una moneta in `ink` con l'euro ritagliato nel colore del fondo. Dice insieme «budget» (la fascia) e «soldi» (la moneta).

- **Sorgenti:** `assets/brand/` (SVG sulla griglia 108 delle icone adattive di Android, segno dentro la zona sicura). L'euro è il glifo di Archivo ExtraBold convertito in tracciato: l'icona non dipende da un carattere installato.
- **Varianti:** chiara (fondo `background`), scura (fondo `background-dark`, linee schiarite), a un colore per le icone a tema di Android 13+ (le separazioni e l'euro sono vuoti, il binario al 38%).
- **File dell'app:** `assets/images/icon.png`, `android-icon-foreground.png` / `-background.png` / `-monochrome.png`, `splash-icon.png` e `splash-icon-dark.png`, `favicon.png`, generati dagli SVG.
- **Non fare:** niente quadrato rosso con la «M» o altri segni dei marchi della metropolitana di Milano: Capolinea ne riprende il linguaggio, mai il marchio. Niente sfondi sfumati dietro il segno.
