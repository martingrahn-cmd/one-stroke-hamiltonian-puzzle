import { createRng, hashStringToSeed, shuffle } from "../core/rng.js";

const DEFAULT_MIX = {
  easy: 3,
  medium: 3,
  hard: 2,
  "very-hard": 2,
};

const ORDER_TEMPLATE = [
  "easy",
  "medium",
  "easy",
  "hard",
  "medium",
  "very-hard",
  "medium",
  "hard",
  "easy",
  "very-hard",
];

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

export function createMixedChallenge(levels, seedInput, mix = DEFAULT_MIX) {
  const seed = normalizeSeed(seedInput);
  const random = createRng(hashStringToSeed(seed));
  const byDifficulty = groupByDifficulty(levels);

  const picked = {};
  for (const [difficulty, count] of Object.entries(mix)) {
    picked[difficulty] = pickDistinct(byDifficulty[difficulty] ?? [], count, random);
  }

  const ordered = [];
  const usedIds = new Set();

  for (const difficulty of ORDER_TEMPLATE) {
    const pool = picked[difficulty] ?? [];
    const nextLevel = pool.pop();
    if (!nextLevel || usedIds.has(nextLevel.id)) {
      continue;
    }
    usedIds.add(nextLevel.id);
    ordered.push(nextLevel);
  }

  // Fallback if the template didn't yield 10 levels.
  if (ordered.length < 10) {
    const leftovers = Object.values(picked).flat();
    shuffle(leftovers, random);
    for (const level of leftovers) {
      if (ordered.length >= 10) {
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
    levels: ordered.slice(0, 10),
    mix,
  };
}
