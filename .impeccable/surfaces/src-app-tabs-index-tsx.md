---
version: 1
slug: "src-app-tabs-index-tsx"
primary_target: "src/app/(tabs)/index.tsx"
related_targets: ["src/app"]
---

# Surface brief: app shell and Home

Scope: the whole app shell (tab bar, add flow, screens) with the Home as first surface. Visitor mode: Operate.
Audience and job: one person tracking personal spending in euro, in Italy; reads the month in 5 seconds, adds an expense in 3 taps, right after paying or in a batch at night.
Constraints: Expo SDK 57 in Expo Go (Galaxy S24 Ultra, iPad on iPadOS 26), same identity on iOS and Android, light and dark both first-class, glass only on tab bar, sheets, floating elements and selected cards. Code-led build (no image generation). Mock data, pinned date 24/10/2026.
Chosen direction: Linea, chosen by the user over Libretto (assigned), Portabiglietti and the canon, after seeing hand-drawn Home mocks in light and dark (artifact R86TgzkkpsoQSTaw7FEWTU).
Memorable moment: saving an expense makes its category segment grow along the month band while the "sei qui" marker holds its place.
Unresolved: app name (Stilla, Sereno, Kivo), final category colour map validated with the dataviz checker.

## Direction contract

THESIS: The month is a line you ride. One continuous band, segmented by category like metro lines, shows how far the spending has travelled against where today says it should be, with the budget as the terminus. It refuses the category default: a big balance on a gradient card, a donut chart and generic tiles.

OWN-WORLD: Bob Noorda's 1964 Milan Metro signage. Enamel white ground (#FAFAF8) and station black (#0D0D0E) in dark; ink #111111 / #F4F4F1; one neo-grotesk, Archivo, heavy and slightly condensed for figures, plain for text; categories own saturated enamel line colours (green, yellow, blue, lilac, light blue, magenta, orange…) shown as solid bands and rounded-square line badges with a white initial; red is reserved for alerts and destructive actions; hairlines and one 2 pt ink rule above key totals; rounded-square + button in ink.

STORY: The user opens the app and reads "Speso a ottobre" first, then sees at once whether the band's end is ahead of or behind "sei qui", how much remains before the terminus and where the month will arrive. Categories keep their line colour and badge everywhere, so a colour is learned once. They tap + and add an expense in three taps; the band answers.

FIRST VIEWPORT: Status bar. Row: "Buonasera, Lorenzo" left, privacy eye and avatar right. "Speso a ottobre" label, then the amount at about 50 pt, heavy, cents smaller in grey. Delta line with arrow and words against the same day of last month. Header "La fascia del mese" with "Capolinea 1.600 €" on the right. The 30 pt band: top six categories plus Altro as segments, dashed extension to the forecast, ring marker "sei qui" at today's pace with a short label. Under it "Restano 315 €" and the forecast. A 2 pt ink rule, then "Saldo totale" with the amount. "Le tue linee": the top categories with badge, name, spent against their budget. Floating glass tab bar with Home, Movimenti, the + , Budget, Analisi. Primary action: the + in the centre.

FORM: Linea, my rank 1 of 7 grounded candidates (Milan Metro wayfinding), chosen by the user as the pick card; assigned direction was rank 5 (Libretto). Seed key 6fb91965. Kept from declined challengers: state carried by line form as well as colour (solid spent, dashed forecast, ring for today, struck for void); one type family ranked by size and weight; strict 4 pt grid; daily spending as dots on a fixed magnitude ramp in Analisi; dense, confident Movimenti list. Signature interaction: the band grows its category segment with a spring on save and the marker stays; the band reappears as a thin context strip at the top of Budget and Movimenti; the latest movements read as stops along a line. Motion grammar: horizontal travel, springs that settle once, number roll on totals, crossfades under Reduce Motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
