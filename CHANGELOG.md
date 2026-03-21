# Changelog

Alla noterbara andringar i projektet.

## [Unreleased]

### Added
- Hint-system v1 med hint-knapp och tangentbordsstöd (`H`).
- Visuell hint-markering av rekommenderad nästa nod pa spelplanen.
- Komplett level select modal med sok, svaarighetsfilter och statusfilter.
- Drag-back undo: spelaren kan dra till foregaende nod for snabb angring.
- Lokal challenge-run historik i `localStorage` (senaste 20 runs).
- Trophy-system med 31 achievements: 15 brons, 10 silver, 5 guld, 1 platinum.

### Changed
- Challenge-score tar nu hänsyn till antal hints (poängstraff per hint).
- Challenge-splits visar nu `H`-antal tillsammans med undo/reset.
- Undo/reset-straff i challenge-score ar nu centraliserade som konstanter i kodbasen.
- Drag-back visar nu ocksa lokal straff-feedback direkt pa spelplanen (flytande `+2,5s` vid noden).
- Ny huvudmeny/hub med separata vyer: Single-player, Multiplayer, High-score, Achievement och Credit.
- Achievement-vyn visar nu trophy-fordelning per tier och markerar status per trophy.

## [2026-03-19]

### Added
- Modulaar kodstruktur i `src/` med separata lager for core, data och game.
- Kampanj med 200 banor och svaarsighetsbanden `easy`, `medium`, `hard`, `very-hard`.
- Seedad Challenge Mix med 10 banor ur blandad svaarsighets-pool.
- Challenge-resultatvy med split-tider, totalpoang och exportbar sammanfattning.

### Changed
- Visuell riktning uppdaterad till Circuit Atelier (typografi, energi, spelkansla).
- Tidig progression rebalanserad (fr.a. niva 3 och 4).
- Spelplanens visuella signaler harmoniserade (rundad formspraakslinje i UI).

### Fixed
- Niva 4 verifierad losningsbar och startinstruktioner fortydligade.
