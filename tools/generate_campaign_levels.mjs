import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CAMPAIGN_SEED = "one-stroke-campaign-v3";
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
    minOpenRatio: 0.66,
    minExtraEdges: 1,
    minBranchNodes: 1,
    maxCorridorRatio: 0.82,
    maxDeadEnds: 8,
    minTurnRatio: 0.28,
    minLayerSwitchRatio: 0.14,
    maxPerimeterRatio: 0.68,
    maxMonotonicLayerRunRatio: 0.78,
    maxStraightRunRatio: 0.54,
    pathProfiles: ["balanced", "center-weave", "edge-dive"],
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
    minOpenRatio: 0.72,
    minExtraEdges: 3,
    minBranchNodes: 3,
    minBranchingRatio: 0.1,
    maxCorridorRatio: 0.74,
    maxDeadEnds: 7,
    minTurnRatio: 0.34,
    minLayerSwitchRatio: 0.19,
    maxPerimeterRatio: 0.62,
    maxMonotonicLayerRunRatio: 0.69,
    maxStraightRunRatio: 0.47,
    pathProfiles: ["balanced", "center-weave", "edge-dive", "zigzag", "inside-out"],
    fixedEndRatio: 0.5,
    shapes: ["L-shape", "cross", "diamond"],
    shapedLevelRatio: 0.3,
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
    minOpenRatio: 0.78,
    minExtraEdges: 6,
    minBranchNodes: 5,
    minBranchingRatio: 0.14,
    maxCorridorRatio: 0.66,
    maxDeadEnds: 6,
    minTurnRatio: 0.38,
    minLayerSwitchRatio: 0.24,
    maxPerimeterRatio: 0.57,
    maxMonotonicLayerRunRatio: 0.62,
    maxStraightRunRatio: 0.4,
    pathProfiles: ["balanced", "center-weave", "edge-dive", "zigzag", "branch-hunter", "inside-out"],
    fixedEndRatio: 0.7,
    shapes: ["L-shape", "T-shape", "U-shape", "cross", "diamond"],
    shapedLevelRatio: 0.4,
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
    minOpenRatio: 0.82,
    minExtraEdges: 9,
    minBranchNodes: 7,
    minBranchingRatio: 0.17,
    maxCorridorRatio: 0.6,
    maxDeadEnds: 5,
    minTurnRatio: 0.42,
    minLayerSwitchRatio: 0.28,
    maxPerimeterRatio: 0.52,
    maxMonotonicLayerRunRatio: 0.56,
    maxStraightRunRatio: 0.34,
    pathProfiles: ["center-weave", "edge-dive", "zigzag", "branch-hunter", "inside-out"],
    fixedEndRatio: 1.0,
    // Very-hard: shapes skipped — fixed endpoints + large grids + inside-out provide enough challenge
  },
];

const PATH_STYLE_PROFILES = [
  {
    id: "balanced",
    startZone: "any",
    weights: {
      onward: 1.3,
      centerAffinity: 0.46,
      borderDistance: 0.52,
      turn: 0.62,
      escapeBorder: 0.72,
      borderStick: 0.6,
      borderPenalty: 2.25,
      jitter: 0.22,
    },
    borderRatioTarget: 0.58,
  },
  {
    id: "center-weave",
    startZone: "center",
    weights: {
      onward: 1.1,
      centerAffinity: 1.05,
      borderDistance: 0.7,
      turn: 1.08,
      escapeBorder: 0.4,
      borderStick: 0.45,
      borderPenalty: 1.85,
      jitter: 0.24,
    },
    borderRatioTarget: 0.55,
  },
  {
    id: "edge-dive",
    startZone: "edge",
    weights: {
      onward: 1.2,
      centerAffinity: 0.6,
      borderDistance: 0.82,
      turn: 0.84,
      escapeBorder: 1.2,
      borderStick: 1.12,
      borderPenalty: 2.6,
      jitter: 0.2,
    },
    borderRatioTarget: 0.5,
  },
  {
    id: "zigzag",
    startZone: "edge-or-center",
    weights: {
      onward: 1.02,
      centerAffinity: 0.44,
      borderDistance: 0.53,
      turn: 1.36,
      escapeBorder: 0.6,
      borderStick: 0.75,
      borderPenalty: 2.08,
      jitter: 0.28,
    },
    borderRatioTarget: 0.56,
  },
  {
    id: "branch-hunter",
    startZone: "any",
    weights: {
      onward: 1.65,
      centerAffinity: 0.35,
      borderDistance: 0.44,
      turn: 0.74,
      escapeBorder: 0.46,
      borderStick: 0.42,
      borderPenalty: 1.7,
      jitter: 0.17,
    },
    borderRatioTarget: 0.6,
  },
  {
    id: "inside-out",
    startZone: "center",
    weights: {
      onward: 1.0,
      centerAffinity: 1.4,
      borderDistance: 0.9,
      turn: 0.95,
      escapeBorder: 0.3,
      borderStick: 0.3,
      borderPenalty: 2.8,
      jitter: 0.18,
    },
    borderRatioTarget: 0.35,
  },
];

const PATH_STYLE_PROFILE_BY_ID = Object.fromEntries(
  PATH_STYLE_PROFILES.map((profile) => [profile.id, profile]),
);

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

function neighbors(x, y, width, height, forbiddenSet) {
  const result = [];
  if (x > 0 && (!forbiddenSet || !forbiddenSet.has(key(x - 1, y)))) {
    result.push([x - 1, y]);
  }
  if (x < width - 1 && (!forbiddenSet || !forbiddenSet.has(key(x + 1, y)))) {
    result.push([x + 1, y]);
  }
  if (y > 0 && (!forbiddenSet || !forbiddenSet.has(key(x, y - 1)))) {
    result.push([x, y - 1]);
  }
  if (y < height - 1 && (!forbiddenSet || !forbiddenSet.has(key(x, y + 1)))) {
    result.push([x, y + 1]);
  }
  return result;
}

// ── Shape generators ──────────────────────────────────────
// Each returns a Set<string> of playable cell keys for the given grid.

function bandWidth(dim) {
  // Wider bands to ensure shapes produce enough playable cells
  if (dim <= 4) return 2;
  if (dim <= 5) return 2;
  if (dim <= 6) return 3;
  return Math.max(3, Math.ceil(dim / 2.5));
}

function generateShapeMask(shapeId, width, height, random) {
  const generators = {
    "L-shape": shapeLGenerator,
    "T-shape": shapeTGenerator,
    "U-shape": shapeUGenerator,
    "cross": shapeCrossGenerator,
    "diamond": shapeDiamondGenerator,
    "Z-shape": shapeZGenerator,
    "H-shape": shapeHGenerator,
  };
  const generator = generators[shapeId];
  if (!generator) return null;
  return generator(width, height, random);
}

function shapeLGenerator(width, height, random) {
  const playable = new Set();
  // Cut one quadrant. Pick which corner to remove.
  const corner = Math.floor(random() * 4);
  const cutW = Math.max(2, Math.floor(width * (0.35 + random() * 0.15)));
  const cutH = Math.max(2, Math.floor(height * (0.35 + random() * 0.15)));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let inCut = false;
      if (corner === 0) inCut = x >= width - cutW && y < cutH;           // top-right
      else if (corner === 1) inCut = x < cutW && y < cutH;               // top-left
      else if (corner === 2) inCut = x < cutW && y >= height - cutH;     // bottom-left
      else inCut = x >= width - cutW && y >= height - cutH;              // bottom-right
      if (!inCut) playable.add(key(x, y));
    }
  }
  return playable;
}

function shapeTGenerator(width, height, random) {
  const playable = new Set();
  const bw = bandWidth(width);
  const bh = bandWidth(height);
  // Rotate: 0=top bar + center column, 1=left column + center row, etc.
  const rotation = Math.floor(random() * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let keep = false;
      const cx = Math.floor((width - bw) / 2);
      const cy = Math.floor((height - bh) / 2);
      if (rotation === 0) keep = y < bh || (x >= cx && x < cx + bw);                 // top bar + vertical stem
      else if (rotation === 1) keep = x < bw || (y >= cy && y < cy + bh);             // left bar + horizontal stem
      else if (rotation === 2) keep = y >= height - bh || (x >= cx && x < cx + bw);   // bottom bar + vertical stem
      else keep = x >= width - bw || (y >= cy && y < cy + bh);                        // right bar + horizontal stem
      if (keep) playable.add(key(x, y));
    }
  }
  return playable;
}

function shapeUGenerator(width, height, random) {
  const playable = new Set();
  const bw = bandWidth(width);
  const bh = bandWidth(height);
  // Rotation: which side is open
  const rotation = Math.floor(random() * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let keep = false;
      if (rotation === 0) {
        // open top: left pillar + right pillar + bottom bar
        keep = x < bw || x >= width - bw || y >= height - bh;
      } else if (rotation === 1) {
        // open right: top bar + bottom bar + left column
        keep = y < bh || y >= height - bh || x < bw;
      } else if (rotation === 2) {
        // open bottom: left pillar + right pillar + top bar
        keep = x < bw || x >= width - bw || y < bh;
      } else {
        // open left: top bar + bottom bar + right column
        keep = y < bh || y >= height - bh || x >= width - bw;
      }
      if (keep) playable.add(key(x, y));
    }
  }
  return playable;
}

function shapeCrossGenerator(width, height, random) {
  const playable = new Set();
  const bw = bandWidth(width);
  const bh = bandWidth(height);
  const cx = Math.floor((width - bw) / 2);
  const cy = Math.floor((height - bh) / 2);
  // Optional offset for asymmetry
  const offsetX = random() < 0.3 ? (random() < 0.5 ? -1 : 1) : 0;
  const adjCx = clamp(cx + offsetX, 0, width - bw);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inHorizontal = y >= cy && y < cy + bh;
      const inVertical = x >= adjCx && x < adjCx + bw;
      if (inHorizontal || inVertical) playable.add(key(x, y));
    }
  }
  return playable;
}

function shapeDiamondGenerator(width, height, random) {
  const playable = new Set();
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  // Radius: manhattan distance threshold
  const maxRadius = Math.floor(Math.min(width, height) / 2);
  const radius = maxRadius + (random() < 0.4 ? -0.5 : 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.abs(x - centerX) + Math.abs(y - centerY);
      if (dist <= radius) playable.add(key(x, y));
    }
  }
  return playable;
}

function shapeZGenerator(width, height, random) {
  const playable = new Set();
  const bh = bandWidth(height);
  const diagWidth = Math.max(2, bandWidth(Math.min(width, height)));
  // Mirror: Z or S
  const mirror = random() < 0.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inTopBar = y < bh;
      const inBottomBar = y >= height - bh;
      // Diagonal band connecting top-right to bottom-left (or mirrored)
      const t = height > 1 ? y / (height - 1) : 0.5;
      const diagCenter = mirror ? t * (width - 1) : (1 - t) * (width - 1);
      const inDiag = Math.abs(x - diagCenter) < diagWidth / 2 + 0.5;
      if (inTopBar || inBottomBar || inDiag) playable.add(key(x, y));
    }
  }
  return playable;
}

function shapeHGenerator(width, height, random) {
  const playable = new Set();
  const bw = bandWidth(width);
  const bh = bandWidth(height);
  const cy = Math.floor((height - bh) / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const inLeftPillar = x < bw;
      const inRightPillar = x >= width - bw;
      const inBridge = y >= cy && y < cy + bh;
      if (inLeftPillar || inRightPillar || inBridge) playable.add(key(x, y));
    }
  }
  return playable;
}

function isShapeConnected(playableSet, width, height) {
  if (playableSet.size === 0) return false;
  const start = playableSet.values().next().value;
  const visited = new Set([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    const [cx, cy] = parse(current);
    for (const [nx, ny] of neighbors(cx, cy, width, height)) {
      const nk = key(nx, ny);
      if (playableSet.has(nk) && !visited.has(nk)) {
        visited.add(nk);
        queue.push(nk);
      }
    }
  }
  return visited.size === playableSet.size;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isBorderCell(x, y, width, height) {
  return x === 0 || y === 0 || x === width - 1 || y === height - 1;
}

function borderDistance(x, y, width, height) {
  return Math.min(x, y, width - 1 - x, height - 1 - y);
}

function normalizedCenterAffinity(x, y, width, height) {
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const maxDistance = Math.hypot(centerX, centerY) || 1;
  const distance = Math.hypot(x - centerX, y - centerY);
  return 1 - distance / maxDistance;
}

function directionDeltaByKeys(fromKey, toKey) {
  const [fromX, fromY] = parse(fromKey);
  const [toX, toY] = parse(toKey);
  return [toX - fromX, toY - fromY];
}

function getStartCandidates(width, height, zone, forbiddenSet) {
  const candidates = [];
  const minInteriorLayer = Math.max(1, Math.floor((Math.min(width, height) - 1) / 3));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (forbiddenSet && forbiddenSet.has(key(x, y))) continue;
      const onBorder = isBorderCell(x, y, width, height);
      const interiorDepth = borderDistance(x, y, width, height);

      if (zone === "edge" && onBorder) {
        candidates.push([x, y]);
      } else if (zone === "center" && interiorDepth >= minInteriorLayer) {
        candidates.push([x, y]);
      } else if (zone === "any") {
        candidates.push([x, y]);
      }
    }
  }

  // For shaped boards with "center"/"edge" zone, fall back to any playable cell
  if (candidates.length === 0 && forbiddenSet) {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!forbiddenSet.has(key(x, y))) candidates.push([x, y]);
      }
    }
  }

  return candidates;
}

function chooseStartCoord(width, height, random, zone, forbiddenSet) {
  if (zone === "edge-or-center") {
    const preferEdge = random() < 0.58;
    const edgeCandidates = getStartCandidates(width, height, "edge", forbiddenSet);
    const centerCandidates = getStartCandidates(width, height, "center", forbiddenSet);
    const mixed = preferEdge ? edgeCandidates : centerCandidates;
    const fallback = preferEdge ? centerCandidates : edgeCandidates;
    const pool = mixed.length > 0 ? mixed : fallback;
    if (pool.length > 0) {
      return pool[Math.floor(random() * pool.length)];
    }
  }

  const candidates = getStartCandidates(width, height, zone, forbiddenSet);
  if (candidates.length > 0) {
    return candidates[Math.floor(random() * candidates.length)];
  }
  return [Math.floor(random() * width), Math.floor(random() * height)];
}

function pickPathProfile(spec, random, difficultyIndex, attempt) {
  const preferred = spec.pathProfiles?.length ? spec.pathProfiles : PATH_STYLE_PROFILES.map((profile) => profile.id);
  const jitter = Math.floor(random() * preferred.length);
  const profileId = preferred[(difficultyIndex + attempt + jitter) % preferred.length];
  return PATH_STYLE_PROFILE_BY_ID[profileId] ?? PATH_STYLE_PROFILE_BY_ID.balanced;
}

function scorePathOption({
  currentX,
  currentY,
  nextX,
  nextY,
  onwardCount,
  width,
  height,
  profile,
  prevDelta,
  borderVisitedCount,
  pathLength,
  random,
}) {
  const weights = profile.weights;
  const [nextDx, nextDy] = [nextX - currentX, nextY - currentY];
  const turnValue = prevDelta && (prevDelta[0] !== nextDx || prevDelta[1] !== nextDy) ? 1 : 0;
  const nextOnBorder = isBorderCell(nextX, nextY, width, height);
  const currentOnBorder = isBorderCell(currentX, currentY, width, height);
  const escapeBorder = currentOnBorder && !nextOnBorder ? 1 : 0;
  const borderStick = currentOnBorder && nextOnBorder ? 1 : 0;
  const projectedBorderRatio = (borderVisitedCount + (nextOnBorder ? 1 : 0)) / (pathLength + 1);
  const borderOverflow = Math.max(0, projectedBorderRatio - profile.borderRatioTarget);
  const maxBorderDistance = Math.max(1, Math.floor((Math.min(width, height) - 1) / 2));
  const borderDistanceScore = borderDistance(nextX, nextY, width, height) / maxBorderDistance;
  const centerAffinity = normalizedCenterAffinity(nextX, nextY, width, height);

  return (
    onwardCount * weights.onward +
    centerAffinity * weights.centerAffinity +
    borderDistanceScore * weights.borderDistance +
    turnValue * weights.turn +
    escapeBorder * weights.escapeBorder -
    borderStick * weights.borderStick -
    borderOverflow * weights.borderPenalty +
    random() * weights.jitter
  );
}

function generateSelfAvoidingPath(width, height, length, random, pathProfile, maxAttempts = 260, forbiddenSet) {
  if (length > width * height) {
    return null;
  }

  const profile = pathProfile ?? PATH_STYLE_PROFILE_BY_ID.balanced;
  // Limit backtracking steps per attempt to prevent exponential blowup on shaped grids
  const maxBacktrackSteps = length * length * 4;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const [startX, startY] = chooseStartCoord(width, height, random, profile.startZone, forbiddenSet);
    if (forbiddenSet && forbiddenSet.has(key(startX, startY))) continue;
    const path = [key(startX, startY)];
    const visited = new Set(path);
    let borderVisitedCount = isBorderCell(startX, startY, width, height) ? 1 : 0;
    let steps = 0;

    const buildPath = () => {
      if (path.length === length) {
        return true;
      }
      if (++steps > maxBacktrackSteps) {
        return false;
      }

      const [currentX, currentY] = parse(path[path.length - 1]);
      const prevKey = path.length >= 2 ? path[path.length - 2] : null;
      const prevDelta = prevKey ? directionDeltaByKeys(prevKey, path[path.length - 1]) : null;
      const options = [];
      for (const [nextX, nextY] of neighbors(currentX, currentY, width, height, forbiddenSet)) {
        const nextKey = key(nextX, nextY);
        if (visited.has(nextKey)) {
          continue;
        }
        let onwardCount = 0;
        for (const [testX, testY] of neighbors(nextX, nextY, width, height, forbiddenSet)) {
          const testKey = key(testX, testY);
          if (!visited.has(testKey) && testKey !== nextKey) {
            onwardCount += 1;
          }
        }

        // Early pruning: if a neighbor with degree 1 exists and we're not going there, skip
        // (it will become unreachable if we go elsewhere)
        if (onwardCount === 0 && path.length + 1 < length) {
          continue;
        }

        const score = scorePathOption({
          currentX,
          currentY,
          nextX,
          nextY,
          onwardCount,
          width,
          height,
          profile,
          prevDelta,
          borderVisitedCount,
          pathLength: path.length,
          random,
        });
        options.push({ key: nextKey, nextX, nextY, score });
      }

      options.sort((a, b) => b.score - a.score);

      // Check if any unvisited neighbor has become isolated (degree 0 but path not complete)
      // If so, we must visit that neighbor next or this branch is dead
      if (path.length + 1 < length) {
        const [cx, cy] = parse(path[path.length - 1]);
        for (const [nx, ny] of neighbors(cx, cy, width, height, forbiddenSet)) {
          const nk = key(nx, ny);
          if (visited.has(nk)) continue;
          let deg = 0;
          for (const [tx, ty] of neighbors(nx, ny, width, height, forbiddenSet)) {
            if (!visited.has(key(tx, ty))) deg++;
          }
          if (deg === 0) {
            // This neighbor will be stranded — only valid if it's the last cell
            if (path.length + 1 === length - 1) {
              // Force visiting it
              const forced = options.find(o => o.key === nk);
              if (forced) {
                options.length = 0;
                options.push(forced);
              }
            } else {
              return false; // Dead branch
            }
          }
        }
      }

      for (const option of options) {
        const nextOnBorder = isBorderCell(option.nextX, option.nextY, width, height);
        visited.add(option.key);
        path.push(option.key);
        if (nextOnBorder) {
          borderVisitedCount += 1;
        }
        if (buildPath()) {
          return true;
        }
        if (nextOnBorder) {
          borderVisitedCount -= 1;
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
  let deadEnds = 0;
  let corridorNodes = 0;
  for (const current of openSet) {
    const [x, y] = parse(current);
    let degree = 0;
    for (const [nextX, nextY] of neighbors(x, y, width, height)) {
      if (openSet.has(key(nextX, nextY))) {
        degree += 1;
      }
    }
    if (degree <= 1) {
      deadEnds += 1;
    }
    if (degree === 2) {
      corridorNodes += 1;
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
    deadEnds,
    corridorNodes,
    branchingRatio: branchNodes / path.length,
    corridorRatio: corridorNodes / path.length,
    extraEdges: edgeCount - (path.length - 1),
  };
}

function getPathShapeMetrics(path, width, height) {
  if (path.length <= 1) {
    return {
      turnRatio: 0,
      perimeterRatio: 1,
      perimeterStepRatio: 1,
      layerSwitchRatio: 0,
      maxStraightRunRatio: 1,
      maxMonotonicLayerRunRatio: 1,
    };
  }

  let perimeterNodes = 0;
  let perimeterSteps = 0;
  let turns = 0;
  let layerSwitches = 0;
  let maxStraightRun = 1;
  let currentStraightRun = 1;
  let maxMonotonicLayerRun = 1;
  let currentMonotonicLayerRun = 1;
  let layerTrend = 0;

  const layers = path.map((pathKey) => {
    const [x, y] = parse(pathKey);
    if (isBorderCell(x, y, width, height)) {
      perimeterNodes += 1;
    }
    return borderDistance(x, y, width, height);
  });

  const directionList = [];
  for (let index = 0; index < path.length - 1; index += 1) {
    const [dx, dy] = directionDeltaByKeys(path[index], path[index + 1]);
    directionList.push(`${dx},${dy}`);
    const [fromX, fromY] = parse(path[index]);
    const [toX, toY] = parse(path[index + 1]);
    if (isBorderCell(fromX, fromY, width, height) && isBorderCell(toX, toY, width, height)) {
      perimeterSteps += 1;
    }

    if (index >= 1 && directionList[index] !== directionList[index - 1]) {
      turns += 1;
      currentStraightRun = 1;
    } else if (index >= 1) {
      currentStraightRun += 1;
    }
    maxStraightRun = Math.max(maxStraightRun, currentStraightRun);
  }

  for (let index = 1; index < layers.length; index += 1) {
    const delta = Math.sign(layers[index] - layers[index - 1]);
    if (layers[index] !== layers[index - 1]) {
      layerSwitches += 1;
    }

    if (delta === 0 || layerTrend === 0 || delta === layerTrend) {
      currentMonotonicLayerRun += 1;
      if (delta !== 0) {
        layerTrend = delta;
      }
    } else {
      currentMonotonicLayerRun = 2;
      layerTrend = delta;
    }
    maxMonotonicLayerRun = Math.max(maxMonotonicLayerRun, currentMonotonicLayerRun);
  }

  const stepCount = path.length - 1;
  return {
    turnRatio: turns / Math.max(1, stepCount - 1),
    perimeterRatio: perimeterNodes / path.length,
    perimeterStepRatio: perimeterSteps / stepCount,
    layerSwitchRatio: layerSwitches / stepCount,
    maxStraightRunRatio: maxStraightRun / stepCount,
    maxMonotonicLayerRunRatio: maxMonotonicLayerRun / path.length,
  };
}

function quantize(value, step = 0.05) {
  return Math.round(value / step) * step;
}

function getStartRegion(pathStartKey, width, height) {
  const [x, y] = parse(pathStartKey);
  const horizontal = x < width * 0.33 ? "L" : x > width * 0.66 ? "R" : "C";
  const vertical = y < height * 0.33 ? "T" : y > height * 0.66 ? "B" : "C";
  return `${horizontal}${vertical}`;
}

function buildVariationSignature({ width, height, openRatio, stats, pathMetrics, styleId, startKey }) {
  return [
    `${width}x${height}`,
    styleId,
    quantize(openRatio, 0.04).toFixed(2),
    quantize(stats.branchingRatio, 0.04).toFixed(2),
    quantize(pathMetrics.turnRatio, 0.04).toFixed(2),
    quantize(pathMetrics.perimeterRatio, 0.04).toFixed(2),
    quantize(pathMetrics.layerSwitchRatio, 0.04).toFixed(2),
    getStartRegion(startKey, width, height),
  ].join("|");
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

  if (level.endMode === "fixed") {
    if (!Array.isArray(level.end) || level.end.length !== 2) {
      throw new Error(`Fixed-end level missing valid end coordinate in ${level.id}`);
    }
    if (x !== level.end[0] || y !== level.end[1]) {
      throw new Error(`Solution does not end at fixed endpoint in ${level.id}`);
    }
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
  const seenSignaturesByDifficulty = new Map(
    DIFFICULTY_SPECS.map((spec) => [spec.id, new Map()]),
  );
  let globalIndex = 1;

  for (const spec of DIFFICULTY_SPECS) {
    const signatureCounts = seenSignaturesByDifficulty.get(spec.id);
    console.log(`Generating ${spec.count} levels for ${spec.id}...`);
    for (let difficultyIndex = 1; difficultyIndex <= spec.count; difficultyIndex += 1) {
      let level = null;
      const t0 = Date.now();
      for (let attempt = 0; attempt < 2500 && level === null; attempt += 1) {
        if (attempt > 0 && attempt % 500 === 0) {
          console.log(`  ${spec.id} #${difficultyIndex}: ${attempt} attempts (${((Date.now() - t0) / 1000).toFixed(1)}s)...`);
        }
        const [width, height] = spec.sizes[Math.floor(random() * spec.sizes.length)];

        // Decide: shaped or rectangular
        const useShaped = spec.shapes && spec.shapedLevelRatio && random() < spec.shapedLevelRatio;
        let openCount;
        let forbiddenSet = null;
        let shapeId = null;

        if (useShaped) {
          shapeId = spec.shapes[Math.floor(random() * spec.shapes.length)];
          const playableSet = generateShapeMask(shapeId, width, height, random);
          if (!playableSet || playableSet.size < (spec.openRange[0] ?? 10)) continue;
          if (playableSet.size > spec.openRange[1]) continue;
          if (!isShapeConnected(playableSet, width, height)) continue;

          openCount = playableSet.size;
          forbiddenSet = new Set();
          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              if (!playableSet.has(key(x, y))) forbiddenSet.add(key(x, y));
            }
          }
        } else {
          const maxOpen = Math.min(spec.openRange[1], width * height);
          const minOpen = Math.min(spec.openRange[0], maxOpen);
          openCount = minOpen + Math.floor(random() * (maxOpen - minOpen + 1));
          const openRatioCheck = openCount / (width * height);
          if (openRatioCheck < (spec.minOpenRatio ?? 0)) continue;
        }

        const openRatio = forbiddenSet ? 1.0 : openCount / (width * height);

        const pathProfile = pickPathProfile(spec, random, difficultyIndex, attempt);
        // Shaped levels need more attempts since Hamiltonian paths are harder to find on irregular graphs
        const pathMaxAttempts = forbiddenSet ? 600 : 260;
        const path = generateSelfAvoidingPath(width, height, openCount, random, pathProfile, pathMaxAttempts, forbiddenSet);
        if (!path) {
          continue;
        }

        const stats = getGraphStats(path, width, height);
        const pathMetrics = getPathShapeMetrics(path, width, height);
        const strictness = attempt < 1000 ? 1 : attempt < 1700 ? 0.78 : 0.55;
        const requiredExtraEdges = Math.floor(spec.minExtraEdges * strictness);
        const requiredBranchNodes = Math.floor(spec.minBranchNodes * strictness);
        const requiredBranchingRatio = (spec.minBranchingRatio ?? 0) * strictness;
        const requiredTurnRatio = (spec.minTurnRatio ?? 0) * strictness;
        const requiredLayerSwitchRatio = (spec.minLayerSwitchRatio ?? 0) * strictness;
        const allowedCorridorRatio =
          spec.maxCorridorRatio == null
            ? 1
            : spec.maxCorridorRatio + (1 - strictness) * (1 - spec.maxCorridorRatio);
        const allowedDeadEnds =
          spec.maxDeadEnds == null
            ? Number.POSITIVE_INFINITY
            : Math.ceil(spec.maxDeadEnds + (1 - strictness) * 3);
        const allowedPerimeterRatio =
          spec.maxPerimeterRatio == null
            ? 1
            : clamp(spec.maxPerimeterRatio + (1 - strictness) * 0.24, 0, 1);
        const allowedMonotonicLayerRunRatio =
          spec.maxMonotonicLayerRunRatio == null
            ? 1
            : clamp(spec.maxMonotonicLayerRunRatio + (1 - strictness) * 0.28, 0, 1);
        const allowedStraightRunRatio =
          spec.maxStraightRunRatio == null
            ? 1
            : clamp(spec.maxStraightRunRatio + (1 - strictness) * 0.22, 0, 1);

        // Relax quality filters slightly for shaped levels (non-rectangular geometry naturally has different characteristics)
        const shapeRelax = forbiddenSet ? 0.85 : 1;
        const qualityFilterSatisfied =
          stats.extraEdges >= Math.floor(requiredExtraEdges * shapeRelax) &&
          stats.branchNodes >= Math.floor(requiredBranchNodes * shapeRelax) &&
          stats.branchingRatio >= requiredBranchingRatio * shapeRelax &&
          stats.corridorRatio <= allowedCorridorRatio + (forbiddenSet ? 0.06 : 0) &&
          stats.deadEnds <= allowedDeadEnds + (forbiddenSet ? 2 : 0) &&
          pathMetrics.turnRatio >= requiredTurnRatio * shapeRelax &&
          pathMetrics.layerSwitchRatio >= requiredLayerSwitchRatio * shapeRelax &&
          pathMetrics.perimeterRatio <= allowedPerimeterRatio + (forbiddenSet ? 0.08 : 0) &&
          pathMetrics.maxMonotonicLayerRunRatio <= allowedMonotonicLayerRunRatio &&
          pathMetrics.maxStraightRunRatio <= allowedStraightRunRatio;

        if (!qualityFilterSatisfied) {
          continue;
        }

        const variationSignature = buildVariationSignature({
          width,
          height,
          openRatio,
          stats,
          pathMetrics,
          styleId: shapeId ? `${pathProfile.id}:${shapeId}` : pathProfile.id,
          startKey: path[0],
        });
        const signatureCount = signatureCounts.get(variationSignature) ?? 0;
        const allowedSignatureReuse = attempt < 1100 ? 0 : attempt < 1800 ? 1 : 2;
        if (signatureCount > allowedSignatureReuse) {
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

        // Don't combine shaped boards with fixed endpoints — each is challenging enough alone
        const useFixedEnd = !shapeId && spec.fixedEndRatio != null && random() < spec.fixedEndRatio;
        const endCoord = parse(path[path.length - 1]);
        const startCoord = parse(path[0]);

        // For fixed-end, ensure endpoint is not adjacent to start (too trivial)
        if (useFixedEnd) {
          const dist = Math.abs(endCoord[0] - startCoord[0]) + Math.abs(endCoord[1] - startCoord[1]);
          if (dist <= 1) {
            continue;
          }
        }

        level = {
          formatVersion: 3,
          id: `level_${String(globalIndex).padStart(3, "0")}`,
          name: makeLevelName(spec.id, difficultyIndex),
          campaignIndex: globalIndex,
          difficulty: spec.id,
          width,
          height,
          blocked,
          start: startCoord,
          endMode: useFixedEnd ? "fixed" : "free",
          ...(useFixedEnd ? { end: endCoord } : {}),
          ...(shapeId ? { shape: shapeId } : {}),
          par: openCount - 1,
          solution: toDirections(path),
          branchNodes: stats.branchNodes,
          extraEdges: stats.extraEdges,
          deadEnds: stats.deadEnds,
          corridorNodes: stats.corridorNodes,
          branchingRatio: Number(stats.branchingRatio.toFixed(4)),
          corridorRatio: Number(stats.corridorRatio.toFixed(4)),
          openRatio: Number(openRatio.toFixed(4)),
          pathStyle: pathProfile.id,
          turnRatio: Number(pathMetrics.turnRatio.toFixed(4)),
          perimeterRatio: Number(pathMetrics.perimeterRatio.toFixed(4)),
          perimeterStepRatio: Number(pathMetrics.perimeterStepRatio.toFixed(4)),
          layerSwitchRatio: Number(pathMetrics.layerSwitchRatio.toFixed(4)),
          maxStraightRunRatio: Number(pathMetrics.maxStraightRunRatio.toFixed(4)),
          maxMonotonicLayerRunRatio: Number(pathMetrics.maxMonotonicLayerRunRatio.toFixed(4)),
        };

        signatureCounts.set(variationSignature, signatureCount + 1);
      }

      if (!level) {
        throw new Error(`Failed to generate level ${globalIndex} (${spec.id})`);
      }

      assertSolutionMatchesLevel(level);
      levels.push(level);
      globalIndex += 1;
    }
  }

  // Log shape distribution
  const shapeCounts = {};
  for (const l of levels) {
    if (l.shape) shapeCounts[l.shape] = (shapeCounts[l.shape] ?? 0) + 1;
  }
  const shapedTotal = Object.values(shapeCounts).reduce((a, b) => a + b, 0);
  console.log(`Shaped levels: ${shapedTotal}/${levels.length} — ${JSON.stringify(shapeCounts)}`);

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
