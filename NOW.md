# NOW

## Fokus just nu

1. Förbereda grunden för asynkront multiplayer (hjärna > hastighet).
2. Release-rutin och CI-baserad kvalitetssäkring.
3. Ytterligare gameplay-variation (icke-rektangulära former, waypoints).

## Senast klart

- **Fixed endpoint + inside-out profil** (2026-03-28):
  - 105 av 200 banor har nu fast slutpunkt (medium: 50%, hard: 70%, very-hard: 100%).
  - Ny "inside-out" path-profil med hög centerAffinity och låg borderRatioTarget.
  - Visuell målnods-markör (guld "E") och uppdaterad win/loss-logik.
  - Level format version 3, kampanjbanor regenererade med seed v2.
- **P1 Singleplayer-kvalitet** (2026-03-28):
  - QA-pass, förbättrad fail/reset-feedback, trophies.js + formatting.js utbrutna.

## Aktivt arbete (nästa konkreta block)

- Multiplayer: designa scoring som belönar effektivitet (färre undo/reset) över ren hastighet.
- Knyta challenge-summary-payloaden till backend-kontrakt.
- Utforska icke-rektangulära banformer.

## Pause / senare

- Backend och konton (krävs inte för lokal singleplayer).
- Daily/seasonal rotations.
