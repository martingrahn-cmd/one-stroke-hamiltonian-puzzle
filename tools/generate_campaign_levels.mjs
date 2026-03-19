import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAMPAIGN_SEED = "one-stroke-campaign-v1";
const OUTPUT_FILE = path.resolve(__dirname, "../src/data/campaign-levels.js");

const DIFFICULTY_SPECS = [
  {
    id: "easy",
    count: 60,
    sizes: [
      [4, 4],
      [5, 4],
      [5, 5],
    ],
    openRange: [14, 22],
    minExtraEdges: 0,
    minBranchNodes: 0,
  },
  {
    id: "medium",
    count: 60,
    sizes: [
      [5, 5],
      [6, 5],
      [6, 6],
    ],
    openRange: [22, 30],
    minExtraEdges: 2,
    minBranchNodes: 1,
  },
  {
    id: "hard",
    count: 50,
    sizes: [
      [6, 6],
      [7, 6],
      [7, 7],
    ],
    openRange: [30, 40],
    minExtraEdges: 4,
    minBranchNodes: 2,
  },
  {
    id: "very-hard",
    count: 30,
    sizes: [
      [7, 7],
      [8, 7],
      [8, 8],
    ],
    openRange: [38, 48],
    minExtraEdges: 6,
    minBranchNodes: 3,
  },
];

function key(x, y) {
  return `${x},${y}`;
}

function parse(keyValue) {
  return keyValue.split(",").map(Number);
}

function hashStringToSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRng(seedValue) {
  let state = seedValue >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, random) {
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
}

function neighbors(x, y, width, height) {
  const result = [];
  if (x > 0) {
    result.push([x - 1, y]);
  }
  if (x < width - 1) {
    result.push([x + 1, y]);
  }
  if (y > 0) {
    result.push([x, y - 1]);
  }
  if (y < height - 1) {
    result.push([x, y + 1]);
  }
  return result;
}

function generateSelfAvoidingPath(width, height, length, random, maxAttempts = 240) {
  if (length > width * height) {
    return null;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const startX = Math.floor(random() * width);
    const startY = Math.floor(random() * height);
    const path = [key(startX, startY)];
    const visited = new Set(path);

    const buildPath = () => {
      if (path.length === length) {
        return true;
      }

      const [currentX, currentY] = parse(path[path.length - 1]);
      const options = [];
      for (const [nextX, nextY] of neighbors(currentX, currentY, width, height)) {
        const nextKey = key(nextX, nextY);
        if (visited.has(nextKey)) {
          continue;
        }
        let onwardCount = 0;
        for (const [testX, testY] of neighbors(nextX, nextY, width, height)) {
          const testKey = key(testX, testY);
          if (!visited.has(testKey) && testKey !== nextKey) {
            onwardCount += 1;
          }
        }
        options.push({ key: nextKey, onwardCount });
      }

      shuffle(options, random);
      options.sort((a, b) => b.onwardCount - a.onwardCount);

      for (const option of options) {
        visited.add(option.key);
        path.push(option.key);
        if (buildPath()) {
          return true;
        }
        path.pop();
        visited.delete(option.key);
      }

      return false;
    };

    if (buildPath()) {
      return path;
    }
  }

  return null;
}

function getGraphStats(path, width, height) {
  const openSet = new Set(path);
  let edgeCount = 0;
  let branchNodes = 0;
  for (const current of openSet) {
    const [x, y] = parse(current);
    let degree = 0;
    for (const [nextX, nextY] of neighbors(x, y, width, height)) {
      if (openSet.has(key(nextX, nextY))) {
        degree += 1;
      }
    }
    if (degree >= 3) {
      branchNodes += 1;
    }
    if (x < width - 1 && openSet.has(key(x + 1, y))) {
      edgeCount += 1;
    }
    if (y < height - 1 && openSet.has(key(x, y + 1))) {
      edgeCount += 1;
    }
  }

  return {
    branchNodes,
    extraEdges: edgeCount - (path.length - 1),
  };
}

function toDirections(path) {
  const result = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const [fromX, fromY] = parse(path[index]);
    const [toX, toY] = parse(path[index + 1]);
    const dx = toX - fromX;
    const dy = toY - fromY;
    if (dx === 1 && dy === 0) {
      result.push("R");
    } else if (dx === -1 && dy === 0) {
      result.push("L");
    } else if (dx === 0 && dy === 1) {
      result.push("D");
    } else if (dx === 0 && dy === -1) {
      result.push("U");
    } else {
      throw new Error("Found non-orthogonal move while creating directions.");
    }
  }
  return result.join("");
}

function assertSolutionMatchesLevel(level) {
  const blockedSet = new Set(level.blocked.map(([x, y]) => key(x, y)));
  const visited = new Set([key(level.start[0], level.start[1])]);
  let x = level.start[0];
  let y = level.start[1];
  for (const move of level.solution) {
    if (move === "R") {
      x += 1;
    } else if (move === "L") {
      x -= 1;
    } else if (move === "D") {
      y += 1;
    } else if (move === "U") {
      y -= 1;
    } else {
      throw new Error(`Unknown move '${move}' in ${level.id}`);
    }

    if (x < 0 || x >= level.width || y < 0 || y >= level.height) {
      throw new Error(`Solution leaves board bounds in ${level.id}`);
    }

    const current = key(x, y);
    if (blockedSet.has(current)) {
      throw new Error(`Solution enters blocked node in ${level.id}`);
    }
    if (visited.has(current)) {
      throw new Error(`Solution revisits node in ${level.id}`);
    }
    visited.add(current);
  }

  const playableCount = level.width * level.height - level.blocked.length;
  if (visited.size !== playableCount) {
    throw new Error(`Solution does not cover all playable nodes in ${level.id}`);
  }

  if (level.par !== playableCount - 1) {
    throw new Error(`Par mismatch in ${level.id}`);
  }
}

function makeLevelName(difficulty, indexInDifficulty) {
  const difficultyNames = {
    easy: "Easy",
    medium: "Medium",
    hard: "Hard",
    "very-hard": "Very Hard",
  };
  return `${difficultyNames[difficulty]} ${String(indexInDifficulty).padStart(2, "0")}`;
}

function generateCampaignLevels(seed) {
  const random = createRng(hashStringToSeed(seed));
  const levels = [];
  let globalIndex = 1;

  for (const spec of DIFFICULTY_SPECS) {
    console.log(`Generating ${spec.count} levels for ${spec.id}...`);
    for (let difficultyIndex = 1; difficultyIndex <= spec.count; difficultyIndex += 1) {
      let level = null;
      for (let attempt = 0; attempt < 650 && level === null; attempt += 1) {
        const [width, height] = spec.sizes[Math.floor(random() * spec.sizes.length)];
        const maxOpen = Math.min(spec.openRange[1], width * height);
        const minOpen = Math.min(spec.openRange[0], maxOpen);
        const openCount = minOpen + Math.floor(random() * (maxOpen - minOpen + 1));

        const path = generateSelfAvoidingPath(width, height, openCount, random);
        if (!path) {
          continue;
        }

        const stats = getGraphStats(path, width, height);
        const strictFilterSatisfied =
          stats.extraEdges >= spec.minExtraEdges && stats.branchNodes >= spec.minBranchNodes;
        const fallbackFilterSatisfied = attempt > 420;
        if (!strictFilterSatisfied && !fallbackFilterSatisfied) {
          continue;
        }

        const openSet = new Set(path);
        const blocked = [];
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            const current = key(x, y);
            if (!openSet.has(current)) {
              blocked.push([x, y]);
            }
          }
        }

        level = {
          formatVersion: 2,
          id: `level_${String(globalIndex).padStart(3, "0")}`,
          name: makeLevelName(spec.id, difficultyIndex),
          campaignIndex: globalIndex,
          difficulty: spec.id,
          width,
          height,
          blocked,
          start: parse(path[0]),
          endMode: "free",
          par: openCount - 1,
          solution: toDirections(path),
          branchNodes: stats.branchNodes,
          extraEdges: stats.extraEdges,
        };
      }

      if (!level) {
        throw new Error(`Failed to generate level ${globalIndex} (${spec.id})`);
      }

      assertSolutionMatchesLevel(level);
      levels.push(level);
      globalIndex += 1;
    }
  }

  return levels;
}

async function run() {
  const levels = generateCampaignLevels(CAMPAIGN_SEED);
  const counts = Object.fromEntries(DIFFICULTY_SPECS.map((spec) => [spec.id, spec.count]));
  const generatedAt = new Date().toISOString();

  const fileContent = `/* eslint-disable */\n// Auto-generated by tools/generate_campaign_levels.mjs\n// Generated at ${generatedAt}\n// Seed: ${CAMPAIGN_SEED}\n\nexport const CAMPAIGN_SEED = ${JSON.stringify(CAMPAIGN_SEED)};\nexport const DIFFICULTY_ORDER = ${JSON.stringify(DIFFICULTY_SPECS.map((spec) => spec.id))};\nexport const DIFFICULTY_COUNTS = ${JSON.stringify(counts, null, 2)};\nexport const CAMPAIGN_LEVELS = ${JSON.stringify(levels, null, 2)};\nexport const CAMPAIGN_TOTAL_LEVELS = CAMPAIGN_LEVELS.length;\n`;

  await fs.writeFile(OUTPUT_FILE, fileContent, "utf8");
  console.log(`Wrote ${levels.length} levels to ${OUTPUT_FILE}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
