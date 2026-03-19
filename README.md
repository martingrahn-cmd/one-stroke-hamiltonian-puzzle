# One Stroke

Hamiltonian path-pussel i webben: dra en sammanhangande vag som besoker varje nod exakt en gang.

## Snabbstart

Projektet ar statiskt (ingen build step kravs).

```bash
cd "/Users/martingrahn/Documents/New project"
python3 -m http.server 5173
```

Oppna sedan `http://localhost:5173`.

## Dokumentation

- [gamedesign.md](./gamedesign.md) - overgripande speldesign, beslut och vision.
- [CHANGELOG.md](./CHANGELOG.md) - vad vi har gjort.
- [NOW.md](./NOW.md) - vad vi jobbar med just nu.
- [IDEAS.md](./IDEAS.md) - ideer for framtida features.
- [TODO.md](./TODO.md) - prioriterad att-gora-lista.
- [BUGS.md](./BUGS.md) - oppna buggar och buggrapport-format.

## Kodstruktur

- `src/core/` - grundlogik (grid, validering, RNG)
- `src/data/` - banor och svaarighetsmetadata
- `src/game/` - game loop, state, challenge-system, lagring
- `tools/` - scripts for level/content-pipeline och assets
