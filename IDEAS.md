# IDEAS

## Gameplay-variation (prioriterat)

- **Inside-out path-profil**: Ny profil i generatorn med hög centerAffinity, låg borderRatioTarget (~0.30), och stark borderPenalty. Tvingar spelaren att börja i mitten istället för yttervarvet.
- **Kantblockering**: Banor med fler blockerade noder längs kanterna, så perimeter-first-strategi inte fungerar.
- **Icke-rektangulära former**: T-form, L-form, korsform — bryter "dra ytterkanten"-heuristiken.
- **Obligatoriska waypoints**: Noder som måste besökas i viss ordning (tvingar icke-linjär planering).
- **One-way edges**: Envägspilar som begränsar rörelsefrihet och kräver framåttänk.

## Multiplayer och socialt

- Asynkron 1v1-challenge med 10 seedade banor.
- Live delresultat efter varje bana (du leder/ligger efter).
- Delbar matchrapport med poäng, splits, undo/reset och win-rate.
- Weekly challenge med global leaderboard.
- Daily seed (alla spelar samma bana den dagen).

## Singleplayer progression

- Stjärnsystem per bana (tid, undo, reset).
- Mjuk adaptiv svårighetskurva vid fail-streaks.
- Curated playlists: "snabba", "knepiga", "parity traps".

## UX och polish

- Replay/ghost av egen bästa lösning.
- Förbättrad tillgänglighet: kontrastläge, tydligare dragindikator, fullständig tangentbordsnavigering.
- Skärmläsarstöd med ARIA-live-regioner.
- Tema-pack med visuella variationer.
