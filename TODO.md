# TODO

## Nyligen klart

- [x] Hint-system v1 (rekommenderad nod + visuell markering + hint-straff i challenge score).
- [x] Resultatvy per challenge-run (splits, totalpoäng, export).
- [x] Komplett level select med sök, filter och direktnavigering till kampanjnivå.
- [x] Drag-back undo: dra bakåt till föregående nod för snabb ångring (räknas i undo-statistik).
- [x] Lokal straff-feedback på spelplanen vid drag-back (`+2,5s` vid noden).
- [x] Huvudmeny med tydliga vyer: Single-player, Multiplayer, High-score, Achievement, Credit.
- [x] Lokal challenge-run historik (senaste 20 runs).
- [x] Trophy-stege implementerad: 15 brons, 10 silver, 5 guld, 1 platinum.
- [x] Visa global statistik: best time, medeltid, win-rate per svårsighet.
- [x] Riktig resultatvy per run med jämförelse mot personligt bästa.
- [x] Standardisera exportpayload för challenge-summary (JSON + text).

## P1 - Singleplayer kvalitet (klart 2026-03-28)

- [x] QA-pass över hela 200-banors progression (lösbarhet + pacing). Alla banor validerade, 72 QA-flaggor granskade (metric-outliers, branching-hopp). Inga blockerare, alla band-övergångar smidiga.
- [x] Par-värden verifierade: par = playableCount - 1 för alla 200+8 banor, inga par-outliers.
- [x] Förbättrad fail-feedback: visar progress (besökta/totala noder, procent), hint-knapp i status.
- [x] Förbättrad reset-feedback: visar antal noder kvar efter reset.
- [x] Kodstruktur: bröt ut trophies.js (31 trophies) och formatting.js (12 visningsfunktioner) från app.js.

## P2 - Multiplayer foundation

- [ ] Definiera backend-kontrakt för challenge run events.
- [ ] Skissa anti-fusk plausibility checks.
- [ ] Förbered matchobjekt med seed, tidsfönster och bana-lista.

## P3 - Gameplay-variation

- [ ] Minska "yttervarv-in"-monotoni: banor där perimeter-first-strategi inte fungerar.
- [ ] Fler blockerade noder på kanterna, interna korridorer, noder som tvingar centrum-first.
- [ ] Ny path-profil "inside-out" med hög centerAffinity och låg borderRatioTarget.
- [ ] Överväg icke-rektangulära spelplaner (T-form, L-form) för mer variation.

## Drift och process

- [ ] Sätt upp enkel release-rutin (tag + changelog checkpoint).
- [ ] Lägg till smoke-test script för level-integrity i CI.
