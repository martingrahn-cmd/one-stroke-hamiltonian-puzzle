/**
 * Verify hand-crafted bridge levels and compute all metrics.
 * Run: node tools/verify_bridge_levels.mjs
 */

function key(x, y) { return `${x},${y}`; }
function parse(k) { return k.split(",").map(Number); }

function neighbors(x, y, w, h) {
  const r = [];
  if (x > 0) r.push([x - 1, y]);
  if (x < w - 1) r.push([x + 1, y]);
  if (y > 0) r.push([x, y - 1]);
  if (y < h - 1) r.push([x, y + 1]);
  return r;
}

function isBorderCell(x, y, w, h) {
  return x === 0 || y === 0 || x === w - 1 || y === h - 1;
}

function borderDistance(x, y, w, h) {
  return Math.min(x, y, w - 1 - x, h - 1 - y);
}

const DIR = { R: [1, 0], L: [-1, 0], D: [0, 1], U: [0, -1] };

function solutionToPath(start, solution) {
  const path = [key(start[0], start[1])];
  let [x, y] = start;
  for (const ch of solution) {
    const [dx, dy] = DIR[ch];
    x += dx;
    y += dy;
    path.push(key(x, y));
  }
  return path;
}

function getGraphStats(path, w, h) {
  const openSet = new Set(path);
  let edgeCount = 0, branchNodes = 0, deadEnds = 0, corridorNodes = 0;
  for (const current of openSet) {
    const [x, y] = parse(current);
    let degree = 0;
    for (const [nx, ny] of neighbors(x, y, w, h)) {
      if (openSet.has(key(nx, ny))) degree++;
    }
    if (degree <= 1) deadEnds++;
    if (degree === 2) corridorNodes++;
    if (degree >= 3) branchNodes++;
    if (x < w - 1 && openSet.has(key(x + 1, y))) edgeCount++;
    if (y < h - 1 && openSet.has(key(x, y + 1))) edgeCount++;
  }
  return {
    branchNodes, deadEnds, corridorNodes,
    branchingRatio: +(branchNodes / path.length).toFixed(4),
    corridorRatio: +(corridorNodes / path.length).toFixed(4),
    extraEdges: edgeCount - (path.length - 1),
  };
}

function getPathShapeMetrics(path, w, h) {
  if (path.length <= 1) return { turnRatio: 0, perimeterRatio: 1, perimeterStepRatio: 1, layerSwitchRatio: 0, maxStraightRunRatio: 1, maxMonotonicLayerRunRatio: 1 };
  let perimeterNodes = 0, perimeterSteps = 0, turns = 0, layerSwitches = 0;
  let maxStraightRun = 1, currentStraightRun = 1;
  let maxMonotonicLayerRun = 1, currentMonotonicLayerRun = 1, layerTrend = 0;

  const layers = path.map(k => {
    const [x, y] = parse(k);
    if (isBorderCell(x, y, w, h)) perimeterNodes++;
    return borderDistance(x, y, w, h);
  });

  const dirList = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [fx, fy] = parse(path[i]);
    const [tx, ty] = parse(path[i + 1]);
    dirList.push(`${tx - fx},${ty - fy}`);
    if (isBorderCell(fx, fy, w, h) && isBorderCell(tx, ty, w, h)) perimeterSteps++;
    if (i >= 1 && dirList[i] !== dirList[i - 1]) { turns++; currentStraightRun = 1; }
    else if (i >= 1) currentStraightRun++;
    maxStraightRun = Math.max(maxStraightRun, currentStraightRun);
  }

  for (let i = 1; i < layers.length; i++) {
    const delta = Math.sign(layers[i] - layers[i - 1]);
    if (layers[i] !== layers[i - 1]) layerSwitches++;
    if (delta === 0 || layerTrend === 0 || delta === layerTrend) {
      currentMonotonicLayerRun++;
      if (delta !== 0) layerTrend = delta;
    } else { currentMonotonicLayerRun = 2; layerTrend = delta; }
    maxMonotonicLayerRun = Math.max(maxMonotonicLayerRun, currentMonotonicLayerRun);
  }

  const stepCount = path.length - 1;
  return {
    turnRatio: +(turns / Math.max(1, stepCount - 1)).toFixed(4),
    perimeterRatio: +(perimeterNodes / path.length).toFixed(4),
    perimeterStepRatio: +(perimeterSteps / stepCount).toFixed(4),
    layerSwitchRatio: +(layerSwitches / stepCount).toFixed(4),
    maxStraightRunRatio: +(maxStraightRun / stepCount).toFixed(4),
    maxMonotonicLayerRunRatio: +(maxMonotonicLayerRun / path.length).toFixed(4),
  };
}

// ── Bridge levels ──────────────────────────────────────────
const bridgeLevels = [
  {
    name: "Öppna fältet",
    id: "level_004", campaignIndex: 4, difficulty: "easy",
    width: 3, height: 3, blocked: [],
    start: [0, 0], endMode: "free",
    solution: "RRDLLDRR",
  },
  {
    name: "Hindret",
    id: "level_005", campaignIndex: 5, difficulty: "easy",
    width: 3, height: 4, blocked: [[1, 2]],
    start: [0, 0], endMode: "free",
    solution: "RRDLLDDRRU",
  },
  {
    name: "Bredare väg",
    id: "level_006", campaignIndex: 6, difficulty: "easy",
    width: 4, height: 3, blocked: [[2, 1]],
    start: [0, 0], endMode: "free",
    solution: "RRRDDLLLUR",
  },
  {
    name: "Utforskaren",
    id: "level_007", campaignIndex: 7, difficulty: "easy",
    width: 4, height: 4, blocked: [[0, 0], [3, 3], [1, 2]],
    start: [1, 0], endMode: "free",
    solution: "RRDDLDLLUURR",
  },
  {
    name: "Stigfinnaren",
    id: "level_008", campaignIndex: 8, difficulty: "easy",
    width: 5, height: 4, blocked: [[0, 0], [4, 0], [0, 3], [4, 3], [2, 2]],
    start: [1, 0], endMode: "free",
    solution: "RRDRDLDLLULURR",
  },
];

let allGood = true;
for (const level of bridgeLevels) {
  const path = solutionToPath(level.start, level.solution);
  const blockedSet = new Set(level.blocked.map(([x, y]) => key(x, y)));

  // total open cells
  let openCount = 0;
  for (let y = 0; y < level.height; y++) {
    for (let x = 0; x < level.width; x++) {
      if (!blockedSet.has(key(x, y))) openCount++;
    }
  }

  const pathSet = new Set(path);
  const errors = [];

  // check no duplicates
  if (pathSet.size !== path.length) errors.push("Duplicate nodes in path!");
  // check visits all open cells
  if (path.length !== openCount) errors.push(`Path length ${path.length} != open cells ${openCount}`);
  // check no blocked cells visited
  for (const p of path) {
    if (blockedSet.has(p)) errors.push(`Path visits blocked cell ${p}`);
  }
  // check adjacency
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = parse(path[i]);
    const [bx, by] = parse(path[i + 1]);
    if (Math.abs(ax - bx) + Math.abs(ay - by) !== 1) errors.push(`Non-adjacent step ${path[i]} → ${path[i + 1]}`);
  }
  // check bounds
  for (const p of path) {
    const [x, y] = parse(p);
    if (x < 0 || x >= level.width || y < 0 || y >= level.height) errors.push(`Out of bounds: ${p}`);
  }

  const stats = getGraphStats(path, level.width, level.height);
  const metrics = getPathShapeMetrics(path, level.width, level.height);

  const par = path.length - 1;
  const openRatio = +(openCount / (level.width * level.height)).toFixed(4);

  if (errors.length) {
    console.error(`❌ ${level.name} (${level.id}):`, errors.join("; "));
    allGood = false;
  } else {
    console.log(`✅ ${level.name}: ${path.length} nodes, par ${par}, openRatio ${openRatio}`);
    console.log("   Stats:", JSON.stringify(stats));
    console.log("   Metrics:", JSON.stringify(metrics));
    // Output the full level object
    console.log("   Full level:", JSON.stringify({
      formatVersion: 2,
      id: level.id,
      name: level.name,
      campaignIndex: level.campaignIndex,
      difficulty: level.difficulty,
      width: level.width,
      height: level.height,
      blocked: level.blocked,
      start: level.start,
      endMode: level.endMode,
      par,
      solution: level.solution,
      ...stats, openRatio,
      pathStyle: "bridge",
      ...metrics,
    }, null, 2));
  }
}

if (allGood) console.log("\n🎉 All bridge levels verified!");
else process.exit(1);
