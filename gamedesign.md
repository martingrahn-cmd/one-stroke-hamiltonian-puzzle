# Game Design: Hamiltonian Path Puzzle

## 1. Vision
Skapa ett smart, rent och belönande pusselspel där spelaren drar en väg som besöker varje nod exakt en gång.
Spelet ska kännas:
- Tydligt (enkla regler, snabb förståelse)
- Klurigt (djup svårighetskurva)
- Tillfredsställande (stark "aha"-känsla när lösningen sitter)

Arbetsnamn: **One Stroke**

## 2. Core Fantasy
"Jag ser ett kaos av noder men hittar den perfekta vägen som löser allt i ett svep."

## 3. Målgrupp
- Casual puzzle-spelare (mobil/webb)
- Spelare som gillar logikspel som Sudoku, Slitherlink och Flow

## 4. Core Rules (MVP)
Spelplanen är ett grafnät (initialt ett rektangulärt grid med blockerade rutor).

Spelaren vinner när:
1. Alla spelbara rutor/noder är besökta.
2. Varje nod är besökt exakt en gång.
3. Vägen är en sammanhängande kedja från start till slutnod.
   - **Free mode** (easy): valfri slutnod.
   - **Fixed mode** (medium+): vägen måste sluta på en specifik markerad målnod ("E").

Begränsningar:
1. Endast ortogonala steg (upp, ner, vänster, höger).
2. Inga diagonaler.
3. En nod får inte beträdas mer än en gång.
4. Startnod är låst per bana.
5. I fixed-mode: slutnoden är låst per bana — spelaren vet målet från start.

Förlust/ogiltigt läge:
- Spelaren fastnar innan alla noder är besökta.
- En nod blir isolerad så att lösning inte längre är möjlig.
- I fixed-mode: alla noder besökta men vägen slutar inte på målnoden.

## 5. Core Loop
1. Välj bana.
2. Dra väg från startnod.
3. Läs av ledtrådar från banans struktur.
4. Testa, ångra, förfina.
5. Lös banan och lås upp nästa.

## 6. Spelmekanik (MVP)
- Dra med mus/finger för att skapa väg.
- Ångra-knapp (`Undo`)
- Dra bakåt till föregående nod för snabb ångra (räknas som undo).
- Starta om-knapp (`Reset`)
- Valfri hint-knapp (för senare iteration, ej nödvändigt i första versionen)

## 7. Svårighetsdesign
Vi skalar svårighet genom:
1. Större grid
2. Högre strukturell komplexitet (fler grenpunkter och giltiga val)
3. Kontrollerade hinder för form, inte för att skapa en enda korridor
4. Trängre passager ("choke points") i kombination med alternativa vägar
5. Startpositioner som minskar uppenbara val
6. Särskilda strukturer som skapar parity-fällor

Viktig princip:
- För många hinder gör ofta banan trivial (nästan "en väg att rita").
- Svårighet ska i första hand komma från **beslutsdensitet**, inte från låg öppenhet.

Föreslagen progression:
- **Nybörjare:** 4x4, få hinder, tydliga tvångsdrag.
- **Medel:** 5x5 till 7x7, fler alternativa grenar.
- **Svår:** 8x8+, asymmetri, flera falska huvudspår.

## 8. Banformat (Data Model)
Representera banor i JSON:

```json
{
  "formatVersion": 2,
  "id": "level_001",
  "name": "Intro Sweep",
  "difficulty": "easy",
  "campaignIndex": 1,
  "width": 5,
  "height": 5,
  "blocked": [[1,1], [3,2]],
  "start": [0,0],
  "endMode": "free",
  "par": 14,
  "solution": "RRDDLL..."
}
```

Notering:
- Koordinater är `[x, y]`
- `endMode: "free"` betyder att spelaren får avsluta på valfri nod så länge alla noder är täckta exakt en gång
- `par` = förväntat antal steg i optimal lösning (används för scoring/3-stjärnigt system senare)
- `solution` = referenslösning i U/D/L/R-format för validering och framtida hint-system

## 9. UX-principer
- Spelaren ska alltid se:
1. Hur många noder som återstår
2. Vilken nod som är aktuell
3. Om ett drag är ogiltigt direkt (tydlig visuell feedback)

- Visuell feedback:
1. Besökta noder markeras tydligt
2. Giltiga nästa drag highlightas subtilt
3. Fastlåst läge indikeras direkt

## 10. Scoring & Progression (MVP Light)
- Klarad/oklarad bana (binärt)
- Tidtagning och antal ångringar kan sparas som statistik
- Bana låses upp sekventiellt (Level 1 -> 2 -> 3 ...)

## 11. Teknisk Scope (MVP)
MVP ska innehålla:
1. Spelbar nivåscen med minst 10 handgjorda banor
2. Input för mus + touch
3. Undo/Reset
4. Vinstdetektion + nivåupplåsning (lokalt sparad)
5. Enkel nivåväljare

Ej i MVP:
- Procedural level generation
- Online leaderboard
- Dagliga utmaningar
- Avancerade specialtiles (teleport, lås, nycklar)

## 12. Beslutade Designval
1. Slutnod: **Valfri nod** (fri slutnod).
2. Backtracking: **Endast bakåt längs lagd väg** (dra bakåt eller `Undo`, ingen fri drag-genom av redan besökta noder).
3. UI-fokus: **Desktop first**, med mobil i åtanke.

## 13. Visuell Riktning (Låst)
Stilnamn: **Circuit Atelier**

Designmål:
1. Kännas som ett premium "pussellabb" snarare än ett generiskt casual-spel.
2. Ge tydlig läsbarhet i spelstate även när nivån blir tät och svår.
3. Låta själva vägen kännas fysisk och elektrisk (circuit-trace-känsla).

Typografi:
1. Display/rubriker: `Oxanium`
2. UI-text: `Plus Jakarta Sans`
3. Sekundär rubrikfallback: `Sora`

Färgpalett (core):
1. Bakgrund: `#08141B`, `#122734`, `#1A3A4A`
2. Text: `#EAF4FB`, `#A9C0CD`
3. Accenter: `#1ED6A5` (mint), `#6BCBFF` (cyan), `#FFB84D` (amber)

UI-principer:
1. Mörk, lagerbyggd bakgrund med teknisk grid-textur.
2. Paneler med subtil glas/metall-känsla och skarp kontrast.
3. Vägvisualisering med riktade länkar mellan noder, inte bara färgskifte.

## 14. Status just nu
1. Modulär kodstruktur i `src/` (core, data, game).
2. Kampanj med **200 nivåer** implementerad.
3. Svårighetsband implementerade: `easy`, `medium`, `hard`, `very-hard`.
4. Seedad **Challenge Mix (10 banor)** implementerad med blandad svårighetsgrad.
5. Kampanjprogress + nivåupplåsning sparas lokalt.
6. Nivå 3 och 4 rebalanserade för jämnare tidig progression.
7. Challenge-resultatvy med split-tider, totalpoäng och export av summary implementerad.
8. Hint-system v1 implementerat (nästa rekommenderade nod + hint-straff i challenge-poäng).
9. Komplett level select implementerad (alla 200 nivåer med sök och filter).
10. Drag-back undo implementerat (bakåt-drag till föregående nod räknas som undo, inkl. challenge-straff via undo-score).
11. Huvudmeny/hub implementerad (Single-player, Multiplayer, High-score, Achievement, Credit).
12. Lokal challenge-run historik implementerad (senaste 20 runs i `localStorage`).
13. Trophy-system implementerat i Achievement-vyn (15 brons, 10 silver, 5 guld, 1 platinum).
14. Global high-score statistik implementerad (per svårighetsgrad + challenge-run snitt).
15. Detaljerad run-resultatvy implementerad i High-score (valbar run + jämförelse mot personligt bästa + split-lista).
16. Standardiserad challenge-summary payload implementerad (schema v1 för både JSON-export och text-copy).

## 15. Föreslagna nästa steg
1. Förbättra hint-system till v2 (flerkandidats-hints och tydligare confidence/guide-lager).
2. Lägg till backend för challenge-resultat och vänjämförelse.
3. Knyt challenge-summary schema v1 till backend-kontrakt för lobby/matchflöden.

## 16. Skalbarhet: 200 nivåer
Ja, 200 nivåer är fullt möjligt med rätt innehållspipeline.

Föreslagen modell:
1. En stor banpool (t.ex. 500-2000 banor) med metadata: svårighet, längd, tema, uppskattad lösningstid.
2. Automatisk validering offline: varje bana måste ha minst en giltig Hamiltonian path.
3. Duplicatfilter: bannlysta "nästan identiska" banor för bättre variation.
4. Curaterad progression: nivå 1-200 byggs från poolen med kontrollerad svårighetskurva.
5. Säsongsrotation: nya banpaket kan ersätta delar av poolen utan att bryta kärnsystemet.

Tekniska nycklar (nuvarande implementation):
1. Generator-script: `tools/generate_campaign_levels.mjs`
2. Genererad datakälla: `src/data/campaign-levels.js` (200 nivåer)
3. Integritetsvalidering via referenslösning (`solution`) innan nivåer används
4. Seedad challenge-pool i `src/game/challenge-pool.js`
5. Kvalitetsfilter i generatorn: min open ratio, min branch nodes/extra edges, max corridor ratio

Lösbarhetsgaranti:
1. Varje nivå genereras från en explicit Hamiltonian path.
2. Pathen sparas som referenslösning (`solution`).
3. Integritetsvalidering säkerställer att lösningen täcker alla spelbara noder exakt en gång.

## 17. USP: Asynkront Multiplayer (Vision)
Mål: göra One Stroke socialt och tävlingsinriktat utan krav på realtid.

Matchformat (idé):
1. Systemet väljer slumpmässigt 10 banor från en definierad tävlingspool.
2. Två spelare kör samma 10 banor asynkront under en tidsperiod (t.ex. 24-72 h).
3. Efter varje bana visas delresultat och ranking mot kompisen.
4. Slutställning visas när båda är klara eller när matchtiden löper ut.

Statistik per bana:
1. Klartid
2. Antal undo
3. Antal reset
4. Första-försöket-klarad (ja/nej)
5. Eventuell hint-användning (om hints finns)

Poängmodell (förslag):
1. Primärt: snabbaste klartid vinner banan.
2. Sekundärt: färre undo/reset som tie-break.
3. Matchpoäng summeras över 10 banor.

Produktflöde:
1. Skapa utmaning -> bjud in vän.
2. Båda spelar i egen takt.
3. Efter varje klarad bana: "Du leder med X poäng" / "Du ligger Y bakom".
4. Matchsammanfattning + delbar resultatskärm.

Tekniskt (nästa steg mot full async multiplayer):
1. Matchobjekt med fast `seed` + låst nivålista.
2. Eventlogg per bana (`start`, `finish`, `undoCount`, `resetCount`, `durationMs`).
3. Servervalidering av resultatformat och rimlighetsgränser.
4. Enkel anti-fuskstrategi via plausibility checks och signering av sessionsdata.

Obs:
- Detta är en planerad USP-riktning, inte implementerad i nuvarande MVP.

## 18. Projektdokumentation
For tydlighet i vardagsarbetet finns kompletterande `.md`-filer:
1. `README.md` - projektoversikt och snabbstart.
2. `CHANGELOG.md` - vad som har byggts och andrats.
3. `NOW.md` - vad teamet fokuserar pa just nu.
4. `IDEAS.md` - framtidsideer och experimentspaar.
5. `TODO.md` - prioriterad arbetslista.
6. `BUGS.md` - oppna buggar och buggrapportmall.
