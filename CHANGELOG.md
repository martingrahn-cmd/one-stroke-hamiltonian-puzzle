# Changelog

Alla noterbara ändringar i projektet.

## [Unreleased]

### Added
- Hint-system v1 med hint-knapp och tangentbordsstöd (`H`).
- Visuell hint-markering av rekommenderad nästa nod på spelplanen.
- Komplett level select modal med sök, svårighetsfilter och statusfilter.
- Drag-back undo: spelaren kan dra till föregående nod för snabb ångring.
- Lokal challenge-run historik i `localStorage` (senaste 20 runs).
- Trophy-system med 31 achievements: 15 brons, 10 silver, 5 guld, 1 platinum.
- Global high-score statistik: tabell per svårighetsgrad (best time, medeltid, win-rate) och challenge-run snittkort.
- Detaljerad run-resultatvy i High-score med valbar run, PB-jämförelse och split-list.
- Standardiserat challenge-summary schema v1 för export (JSON) och delning (text).
- Hint-knapp i fail-statusen (ångra + visa hint i ett steg).

### Changed
- Challenge-score tar nu hänsyn till antal hints (poängstraff per hint).
- Challenge-splits visar nu `H`-antal tillsammans med undo/reset.
- Undo/reset-straff i challenge-score är nu centraliserade som konstanter i kodbasen.
- Drag-back visar nu också lokal straff-feedback direkt på spelplanen (flytande `+2,5s` vid noden).
- Ny huvudmeny/hub med separata vyer: Single-player, Multiplayer, High-score, Achievement och Credit.
- Achievement-vyn visar nu trophy-fördelning per tier och markerar status per trophy.
- High-score-vyn visar nu fler aggregerade nyckeltal för challenge-historik.
- High-score run-list är nu interaktiv med markerad vald run och tangentbordsstöd.
- Copy summary och JSON-export bygger nu på samma payload-builder.
- Fail-feedback visar nu progress (besökta/totala noder, procent).
- Reset-feedback visar nu antal noder kvar.

### Refactored
- Bröt ut `trophies.js` (trophy-katalog och tier-metadata) ur app.js.
- Bröt ut `formatting.js` (12 visningsfunktioner) ur app.js.
- Uppdaterad README med fullständig projektstruktur, arkitekturbeskrivning och QA-kommandon.
- Uppdaterad TODO med P1-status och ny P3 (gameplay-variation).

## [2026-03-19]

### Added
- Modulär kodstruktur i `src/` med separata lager för core, data och game.
- Kampanj med 200 banor och svårighetsbanden `easy`, `medium`, `hard`, `very-hard`.
- Seedad Challenge Mix med 10 banor ur blandad svårighets-pool.
- Challenge-resultatvy med split-tider, totalpoäng och exportbar sammanfattning.

### Changed
- Visuell riktning uppdaterad till Circuit Atelier (typografi, energi, spelkänsla).
- Tidig progression rebalanserad (fr.a. nivå 3 och 4).
- Spelplanens visuella signaler harmoniserade (rundad formspråkslinje i UI).

### Fixed
- Nivå 4 verifierad lösningsbar och startinstruktioner förtydligade.
