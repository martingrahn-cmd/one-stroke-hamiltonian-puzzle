/**
 * Hand-crafted tutorial & bridge levels (1–8).
 *
 * These replace the first generated campaign levels to give new players
 * a gentle onboarding followed by a smooth difficulty ramp:
 *
 * TUTORIAL (levels 1–3):
 *   1. Straight line – teaches dragging.
 *   2. L-shape – teaches turning.
 *   3. Spiral around blocked center – teaches path planning.
 *
 * BRIDGE (levels 4–8) – gradual ramp from 9 to 15 nodes:
 *   4. 3×3 fully open – first real freedom of choice.
 *   5. 3×4 with obstacle – longer board, navigate around a block.
 *   6. 4×3 with obstacle – wider board, longer straight runs.
 *   7. 4×4 with obstacles – bigger grid, more branching.
 *   8. 5×4 with obstacles – approaching generated-easy complexity.
 */

export const TUTORIAL_LEVELS = [
  // ── Level 1: "Första draget" ─────────────────────────────────
  // 5x3 grid, only the middle row is open → a straight horizontal line.
  //
  //   X X X X X
  //   S → → → →
  //   X X X X X
  //
  {
    formatVersion: 2,
    id: "level_001",
    name: "Första draget",
    campaignIndex: 1,
    difficulty: "easy",
    width: 5,
    height: 3,
    blocked: [
      [0, 0], [1, 0], [2, 0], [3, 0], [4, 0],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
    ],
    start: [0, 1],
    endMode: "free",
    par: 4,
    solution: "RRRR",
    branchNodes: 0,
    extraEdges: 0,
    deadEnds: 2,
    corridorNodes: 3,
    branchingRatio: 0,
    corridorRatio: 0.6,
    openRatio: 0.3333,
    pathStyle: "tutorial",
    turnRatio: 0,
    perimeterRatio: 1,
    perimeterStepRatio: 1,
    layerSwitchRatio: 0,
    maxStraightRunRatio: 1,
    maxMonotonicLayerRunRatio: 1,
  },

  // ── Level 2: "Svängen" ───────────────────────────────────────
  // 3x3 grid, L-shape of 5 nodes.
  //
  //   S X X
  //   ↓ X X
  //   → → →
  //
  {
    formatVersion: 2,
    id: "level_002",
    name: "Svängen",
    campaignIndex: 2,
    difficulty: "easy",
    width: 3,
    height: 3,
    blocked: [
      [1, 0], [2, 0],
      [1, 1], [2, 1],
    ],
    start: [0, 0],
    endMode: "free",
    par: 4,
    solution: "DDRR",
    branchNodes: 0,
    extraEdges: 0,
    deadEnds: 2,
    corridorNodes: 3,
    branchingRatio: 0,
    corridorRatio: 0.6,
    openRatio: 0.5556,
    pathStyle: "tutorial",
    turnRatio: 0.3333,
    perimeterRatio: 1,
    perimeterStepRatio: 1,
    layerSwitchRatio: 0.25,
    maxStraightRunRatio: 0.5,
    maxMonotonicLayerRunRatio: 0.6,
  },

  // ── Level 3: "Spiralen" ──────────────────────────────────────
  // 3x3 grid with only the center cell blocked → 8 open nodes.
  // Forces the player to wrap around the center.
  //
  //   S . .
  //   . X .
  //   . . .
  //
  {
    formatVersion: 2,
    id: "level_003",
    name: "Spiralen",
    campaignIndex: 3,
    difficulty: "easy",
    width: 3,
    height: 3,
    blocked: [[1, 1]],
    start: [0, 0],
    endMode: "free",
    par: 7,
    solution: "DDRRUUL",
    branchNodes: 4,
    extraEdges: 4,
    deadEnds: 0,
    corridorNodes: 4,
    branchingRatio: 0.5,
    corridorRatio: 0.5,
    openRatio: 0.8889,
    pathStyle: "tutorial",
    turnRatio: 0.6667,
    perimeterRatio: 1,
    perimeterStepRatio: 1,
    layerSwitchRatio: 0.2857,
    maxStraightRunRatio: 0.2857,
    maxMonotonicLayerRunRatio: 0.5,
  },

  // ── Level 4: "Öppna fältet" ─────────────────────────────────
  // 3x3 grid, fully open → 9 nodes, first real freedom.
  //
  //   S → →
  //   ← ← ↓
  //   → → →
  //
  {
    formatVersion: 2,
    id: "level_004",
    name: "Öppna fältet",
    campaignIndex: 4,
    difficulty: "easy",
    width: 3,
    height: 3,
    blocked: [],
    start: [0, 0],
    endMode: "free",
    par: 8,
    solution: "RRDLLDRR",
    branchNodes: 5,
    extraEdges: 4,
    deadEnds: 0,
    corridorNodes: 4,
    branchingRatio: 0.5556,
    corridorRatio: 0.4444,
    openRatio: 1,
    pathStyle: "bridge",
    turnRatio: 0.5714,
    perimeterRatio: 0.8889,
    perimeterStepRatio: 0.75,
    layerSwitchRatio: 0.25,
    maxStraightRunRatio: 0.25,
    maxMonotonicLayerRunRatio: 0.5556,
  },

  // ── Level 5: "Hindret" ─────────────────────────────────────
  // 3x4 grid with one block → 11 nodes, navigate around obstacle.
  //
  //   S → →
  //   ← ← ↓
  //   .  X ↓
  //   → → ←
  //
  {
    formatVersion: 2,
    id: "level_005",
    name: "Hindret",
    campaignIndex: 5,
    difficulty: "easy",
    width: 3,
    height: 4,
    blocked: [[1, 2]],
    start: [0, 0],
    endMode: "free",
    par: 10,
    solution: "RRDLLDDRRU",
    branchNodes: 4,
    extraEdges: 3,
    deadEnds: 0,
    corridorNodes: 7,
    branchingRatio: 0.3636,
    corridorRatio: 0.6364,
    openRatio: 0.9167,
    pathStyle: "bridge",
    turnRatio: 0.5556,
    perimeterRatio: 0.9091,
    perimeterStepRatio: 0.8,
    layerSwitchRatio: 0.2,
    maxStraightRunRatio: 0.2,
    maxMonotonicLayerRunRatio: 0.6364,
  },

  // ── Level 6: "Bredare väg" ──────────────────────────────────
  // 4x3 grid with center block → 11 nodes, wider board.
  //
  //   S → → →
  //   ↑  X ↓ ↓
  //   ← ← ← ↓
  //
  {
    formatVersion: 2,
    id: "level_006",
    name: "Bredare väg",
    campaignIndex: 6,
    difficulty: "easy",
    width: 4,
    height: 3,
    blocked: [[2, 1]],
    start: [0, 0],
    endMode: "free",
    par: 10,
    solution: "RRRDDLLLUR",
    branchNodes: 4,
    extraEdges: 3,
    deadEnds: 0,
    corridorNodes: 7,
    branchingRatio: 0.3636,
    corridorRatio: 0.6364,
    openRatio: 0.9167,
    pathStyle: "bridge",
    turnRatio: 0.4444,
    perimeterRatio: 0.9091,
    perimeterStepRatio: 0.9,
    layerSwitchRatio: 0.1,
    maxStraightRunRatio: 0.3,
    maxMonotonicLayerRunRatio: 1,
  },

  // ── Level 7: "Utforskaren" ──────────────────────────────────
  // 4x4 grid with 3 blocks → 13 nodes, bigger grid.
  //
  //   X  S → →
  //   ← ← ↓ ↓
  //   ↑  X ↓ ↓
  //   ← ← ← X
  //
  {
    formatVersion: 2,
    id: "level_007",
    name: "Utforskaren",
    campaignIndex: 7,
    difficulty: "easy",
    width: 4,
    height: 4,
    blocked: [[0, 0], [3, 3], [1, 2]],
    start: [1, 0],
    endMode: "free",
    par: 12,
    solution: "RRDDLDLLUURR",
    branchNodes: 5,
    extraEdges: 4,
    deadEnds: 0,
    corridorNodes: 8,
    branchingRatio: 0.3846,
    corridorRatio: 0.6154,
    openRatio: 0.8125,
    pathStyle: "bridge",
    turnRatio: 0.5455,
    perimeterRatio: 0.7692,
    perimeterStepRatio: 0.6667,
    layerSwitchRatio: 0.25,
    maxStraightRunRatio: 0.1667,
    maxMonotonicLayerRunRatio: 0.4615,
  },

  // ── Level 8: "Stigfinnaren" ─────────────────────────────────
  // 5x4 grid with 5 blocks → 15 nodes, approaching generated-easy.
  //
  //   X  S → →  X
  //   ← ← ↑ ↓ →
  //   ← ↑ X  ↓ ↓
  //   X  .  ← ← X
  //
  {
    formatVersion: 2,
    id: "level_008",
    name: "Stigfinnaren",
    campaignIndex: 8,
    difficulty: "easy",
    width: 5,
    height: 4,
    blocked: [[0, 0], [4, 0], [0, 3], [4, 3], [2, 2]],
    start: [1, 0],
    endMode: "free",
    par: 14,
    solution: "RRDRDLDLLULURR",
    branchNodes: 6,
    extraEdges: 5,
    deadEnds: 0,
    corridorNodes: 9,
    branchingRatio: 0.4,
    corridorRatio: 0.6,
    openRatio: 0.75,
    pathStyle: "bridge",
    turnRatio: 0.7692,
    perimeterRatio: 0.6667,
    perimeterStepRatio: 0.4286,
    layerSwitchRatio: 0.5,
    maxStraightRunRatio: 0.1429,
    maxMonotonicLayerRunRatio: 0.2667,
  },
];
