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
3. Vägen är en sammanhängande kedja från start till valfri slutnod.

Begränsningar:
1. Endast ortogonala steg (upp, ner, vänster, höger).
2. Inga diagonaler.
3. En nod får inte beträdas mer än en gång.
4. Startnod är låst per bana.

Förlust/ogiltigt läge:
- Spelaren fastnar innan alla noder är besökta.
- En nod blir isolerad så att lösning inte längre är möjlig.

## 5. Core Loop
1. Välj bana.
2. Dra väg från startnod.
3. Läs av ledtrådar från banans struktur.
4. Testa, ångra, förfina.
5. Lös banan och lås upp nästa.

## 6. Spelmekanik (MVP)
- Dra med mus/finger för att skapa väg.
- Ångra-knapp (`Undo`)
- Starta om-knapp (`Reset`)
- Valfri hint-knapp (för senare iteration, ej nödvändigt i första versionen)

## 7. Svårighetsdesign
Vi skalar svårighet genom:
1. Större grid
2. Fler blockerade rutor
3. Trängre passager ("choke points")
4. Startpositioner som minskar uppenbara val
5. Särskilda strukturer som skapar parity-fällor

Föreslagen progression:
- **Nybörjare:** 4x4, få hinder, tydliga tvångsdrag.
- **Medel:** 5x5 till 7x7, fler alternativa grenar.
- **Svår:** 8x8+, asymmetri, flera falska huvudspår.

## 8. Banformat (Data Model)
Representera banor i JSON:

```json
{
  "formatVersion": 1,
  "id": "level_001",
  "name": "Intro Sweep",
  "width": 5,
  "height": 5,
  "blocked": [[1,1], [3,2]],
  "start": [0,0],
  "endMode": "free",
  "par": 14
}
```

Notering:
- Koordinater är `[x, y]`
- `endMode: "free"` betyder att spelaren får avsluta på valfri nod så länge alla noder är täckta exakt en gång
- `par` = förväntat antal steg i optimal lösning (används för scoring/3-stjärnigt system senare)

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
2. Backtracking: **Strikt undo** (ingen drag-genom av redan lagd väg).
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
1. Banformat v1 definierat (`formatVersion`, `endMode`).
2. Minimalt spel-state implementerat (`level`, `path`, `visited`, `win/lose`).
3. Första vertikala slice implementerad (spelbar bana, vinstskärm, nivåupplåsning).
4. Nivå 3 rebalanserad för jämnare progression.
5. Nivå 4 rebalanserad för mjukare svårighetsökning.

## 15. Föreslagna nästa steg
1. Utöka till 10+ handgjorda banor med tydlig svårighetskurva.
2. Lägg till statistik per bana (tid, antal undo, bäst resultat lokalt).
3. Implementera hint-system v1 (en säker nästa nod).

## 16. Skalbarhet: 200 nivåer
Ja, 200 nivåer är fullt möjligt med rätt innehållspipeline.

Föreslagen modell:
1. En stor banpool (t.ex. 500-2000 banor) med metadata: svårighet, längd, tema, uppskattad lösningstid.
2. Automatisk validering offline: varje bana måste ha minst en giltig Hamiltonian path.
3. Duplicatfilter: bannlysta "nästan identiska" banor för bättre variation.
4. Curaterad progression: nivå 1-200 byggs från poolen med kontrollerad svårighetskurva.
5. Säsongsrotation: nya banpaket kan ersätta delar av poolen utan att bryta kärnsystemet.

Tekniska nycklar:
1. `levels.json` (eller shardade filer per difficulty-band).
2. Build-script som validerar + rankar svårighet + exporterar färdig nivålista.
3. Telemetri som mäter verklig svårighet (clear rate, median tid, median undo) för framtida tuning.

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

Tekniskt (framtida, ej MVP):
1. Matchobjekt med fast `seed` eller färdig nivålista.
2. Eventlogg per bana (`start`, `finish`, `undoCount`, `resetCount`, `durationMs`).
3. Servervalidering av resultatformat och rimlighetsgränser.
4. Enkel anti-fuskstrategi via plausibility checks och signering av sessionsdata.

Obs:
- Detta är en planerad USP-riktning, inte implementerad i nuvarande MVP.
