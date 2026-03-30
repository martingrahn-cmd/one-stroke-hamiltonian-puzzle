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

## PWA & distribution

- **PWA med offline-stöd**: Service worker cachar alla assets för full offline-funktion. Installérbar på hemskärmen (mobil & desktop).

## Ljud & haptics

- Korta, satisfying ljudeffekter vid drag, completion, trophy-unlock och fail.
- Vibration API på mobil vid undo och fail för taktil feedback.
- Volymkontroll och mute-toggle i inställningar.

## Puzzle editor & user-generated content

- Låt spelare skapa egna banor (placera noder, blockeringar, start/slut).
- Dela banor via URL med grid-config i en Base64-sträng (samma mönster som matchkoder).
- Kurerade "community picks" av populära spelarskapade banor.

## Daily challenge (seed-baserad)

- Deterministisk daglig bana baserad på seed = YYYY-MM-DD. Ingen backend krävs.
- Alla spelare får samma bana — jämför resultat via delning.
- Streak-tracker: hur många dagar i rad spelaren klarat daily.

## Undo-träd-visualisering

- Visa ett litet träd av försökta vägar istället för linjär undo-historik.
- Hjälper spelaren se vilka grenar de redan testat.
- Unikt feature för genren — pedagogiskt och strategiskt värdefullt.

## Speedrun & par-mode

- Visa par-tid (beräknad optimal tid baserad på bannstorlek) och låt spelare jaga "under par".
- Speedrun-leaderboard per bana (lokalt först, globalt vid backend).
- Ger replayability utan nytt content.

## Onboarding-analytics

- Spåra lokalt (localStorage) var spelare fastnar, ger upp eller använder hints.
- Dashboard i High-score-vyn med "svåraste banor" och "mest resetade".
- Kan driva beslut om vilka banor som behöver tuning.

## UX och polish

- Replay/ghost av egen bästa lösning.
- Förbättrad tillgänglighet: kontrastläge, tydligare dragindikator, fullständig tangentbordsnavigering.
- Skärmläsarstöd med ARIA-live-regioner.
- Tema-pack med visuella variationer.
