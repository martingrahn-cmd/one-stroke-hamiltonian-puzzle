import { createRng, hashStringToSeed, shuffle } from "../core/rng.js";

const MIX_PRESETS = {
  3:  { easy: 1, medium: 1, hard: 1, "very-hard": 0 },
  5:  { easy: 1, medium: 2, hard: 1, "very-hard": 1 },
  10: { easy: 3, medium: 3, hard: 2, "very-hard": 2 },
};

const ORDER_TEMPLATES = {
  3:  ["easy", "medium", "hard"],
  5:  ["easy", "medium", "easy", "hard", "medium"],
  10: ["easy", "medium", "easy", "hard", "medium", "very-hard", "medium", "hard", "easy", "very-hard"],
};

function normalizeSeed(seedInput) {
  const raw = `${seedInput ?? ""}`.trim();
  if (raw.length > 0) {
    return raw;
  }
  return `challenge-${new Date().toISOString().slice(0, 10)}`;
}

function groupByDifficulty(levels) {
  const groups = {
    easy: [],
    medium: [],
    hard: [],
    "very-hard": [],
  };
  for (const level of levels) {
    if (groups[level.difficulty]) {
      groups[level.difficulty].push(level);
    }
  }
  return groups;
}

function pickDistinct(pool, count, random) {
  const copy = [...pool];
  shuffle(copy, random);
  return copy.slice(0, Math.min(count, copy.length));
}

export function createMixedChallenge(levels, seedInput, levelCount = 10) {
  const count = MIX_PRESETS[levelCount] ? levelCount : 10;
  const mix = MIX_PRESETS[count];
  const template = ORDER_TEMPLATES[count];

  const seed = normalizeSeed(seedInput);
  const random = createRng(hashStringToSeed(seed));
  const byDifficulty = groupByDifficulty(levels);

  const picked = {};
  for (const [difficulty, pickCount] of Object.entries(mix)) {
    picked[difficulty] = pickDistinct(byDifficulty[difficulty] ?? [], pickCount, random);
  }

  const ordered = [];
  const usedIds = new Set();

  for (const difficulty of template) {
    const pool = picked[difficulty] ?? [];
    const nextLevel = pool.pop();
    if (!nextLevel || usedIds.has(nextLevel.id)) {
      continue;
    }
    usedIds.add(nextLevel.id);
    ordered.push(nextLevel);
  }

  // Fallback if the template didn't yield enough levels.
  if (ordered.length < count) {
    const leftovers = Object.values(picked).flat();
    shuffle(leftovers, random);
    for (const level of leftovers) {
      if (ordered.length >= count) {
        break;
      }
      if (usedIds.has(level.id)) {
        continue;
      }
      usedIds.add(level.id);
      ordered.push(level);
    }
  }

  return {
    seed,
    levels: ordered.slice(0, count),
    levelCount: count,
    mix,
  };
}
