# One Stroke

Hamiltonian path-pussel i webben: dra en sammanhängande väg som besöker varje nod exakt en gång.

## Snabbstart

Projektet är statiskt (ingen build step krävs).

```bash
python3 -m http.server 5173
```

Öppna sedan `http://localhost:5173`.

## Projektstruktur

```
├── index.html              Huvudsida (spelvy + hubvy + modaler)
├── styles.css              All CSS (tema, layout, komponenter, responsiv)
├── src/
│   ├── main.js             Startpunkt – skapar OneStrokeApp
│   ├── core/               Grundlogik (delad mellan spel och verktyg)
│   │   ├── grid.js         Koordinathjälpare, grannar, validering
│   │   ├── level-integrity.js  Strukturell + lösningsvalidering av banor
│   │   ├── match.js        Asynkront multiplayer-matchobjekt (seed, events, kodning)
│   │   ├── plausibility.js Anti-fusk-kontroller (tid, undo, sekvens)
│   │   └── rng.js          Seedbar PRNG (xorshift) + Fisher-Yates shuffle
│   ├── data/               Statisk speldata
│   │   ├── campaign-levels.js  200 autogenererade kampanjbanor (formatVersion 2)
│   │   ├── difficulty.js       Svårighetsgrad-metadata och ordning
│   │   └── tutorial-levels.js  8 handgjorda tutorial/bridge-banor
│   └── game/               Spellogik och UI
│       ├── app.js          Huvudklass OneStrokeApp (state, rendering, input)
│       ├── challenge-pool.js   Seed-baserad challenge-mix (3/5/10 banor)
│       ├── formatting.js   Visningsformatering (tid, poäng, procent, datum)
│       ├── share-image.js  Canvas-baserad delbar resultatbild (1200x630)
│       ├── storage.js      LocalStorage-hantering (progress, historik, trophies)
│       └── trophies.js     31 trophies i 4 tiers (brons/silver/guld/platinum)
├── tools/                  Pipeline-skript (körs med Node)
│   ├── generate_campaign_levels.mjs   Generera 200 kampanjbanor från seed
│   ├── analyze_progression.mjs        QA-analys av svårighetskurva + outliers
│   ├── verify_bridge_levels.mjs       Verifiera handgjorda bridge-banor
│   ├── capture_marketing.mjs          Skärmdumpar för marknadsföring
│   └── generate_anime_atlas.py        Generera sprite-atlas
└── assets/
    ├── marketing/          Skärmdumpar och OG-bilder
    └── sprites/            Sprite-atlas (atlas.png + atlas.json)
```

## Arkitektur

**Ren klient-app** — inget backend, ingen build, inga dependencies. All data lagras i
`localStorage`. Multiplayer-stöd är förberett med seed-baserade matchobjekt som kan
delas via Base64-kodade matchkoder.

**Flöde:** `main.js` → `OneStrokeApp` → binder DOM, validerar data, startar spel.
Användaren väljer kampanj (200 banor, progressivt upplåsta) eller challenge (slumpmix).

**Nivågenerering:** `generate_campaign_levels.mjs` skapar banor genom att generera
self-avoiding paths på rutnät med viktade pathfinding-profiler (balanced, center-weave,
edge-dive, zigzag, branch-hunter). Kvalitetsfilter säkerställer variation i branching,
corridor-ratio, turn-ratio och perimeter-coverage.

## Dokumentation

| Fil | Innehåll |
|-----|----------|
| [gamedesign.md](./gamedesign.md) | Speldesign, regler, vision och beslut |
| [CHANGELOG.md](./CHANGELOG.md) | Vad vi har gjort (per release) |
| [NOW.md](./NOW.md) | Vad vi jobbar med just nu |
| [TODO.md](./TODO.md) | Prioriterad att-göra-lista |
| [IDEAS.md](./IDEAS.md) | Idéer för framtida features |
| [BUGS.md](./BUGS.md) | Öppna buggar och buggrapport-format |

## QA-verktyg

```bash
# Validera alla banors lösbarhet och struktur
node tools/verify_bridge_levels.mjs

# Analysera svårighetskurva, outliers och pacing
node tools/analyze_progression.mjs

# Regenerera kampanjbanor (ändrar campaign-levels.js)
node tools/generate_campaign_levels.mjs
```

## Tangentbordsgenvägar (i spelvyn)

| Tangent | Funktion |
|---------|----------|
| Z / Backspace | Ångra senaste steg |
| R | Starta om banan |
| H | Hint (föreslå nästa nod) |
| N | Nästa bana |
| L | Öppna banväljare |
| Piltangenter | Flytta steg-för-steg |
| Escape | Stäng modal/banväljare |
