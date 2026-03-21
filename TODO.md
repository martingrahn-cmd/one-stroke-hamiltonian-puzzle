# TODO

## Nyligen klart

- [x] Hint-system v1 (rekommenderad nod + visuell markering + hint-straff i challenge score).
- [x] Resultatvy per challenge-run (splits, totalpoang, export).
- [x] Komplett level select med sok, filter och direktnavigering till kampanjniva.
- [x] Drag-back undo: dra bakat till foregaende nod for snabb angring (raknas i undo-statistik).
- [x] Lokal straff-feedback pa spelplanen vid drag-back (`+2,5s` vid noden).
- [x] Huvudmeny med tydliga vyer: Single-player, Multiplayer, High-score, Achievement, Credit.
- [x] Lokal challenge-run historik (senaste 20 runs).
- [x] Trophy-stege implementerad: 15 brons, 10 silver, 5 guld, 1 platinum.

## P0 - Nasta leverabler

- [x] Visa global statistik: best time, medeltid, win-rate per svaarsighet.
- [x] Lagg till riktig resultatvy per run med jamforelse mot personligt besta.
- [x] Standardisera exportpayload for challenge-summary (JSON + text).

## P1 - Singleplayer kvalitet

- [ ] QA-pass over hela 200-banors progression (losningsbarhet + pacing).
- [ ] Balansjustera par-varden for fler banor.
- [ ] Lagg till snabb restart-flow och tydligare fail-feedback.

## P2 - Multiplayer foundation

- [ ] Definiera backend-kontrakt for challenge run events.
- [ ] Skissa anti-fusk plausibility checks.
- [ ] Forbered matchobjekt med seed, tidsfonster och bana-lista.

## Drift och process

- [ ] Satt upp enkel release-rutin (tag + changelog checkpoint).
- [ ] Lagg till smoke-test script for level-integrity i CI.
