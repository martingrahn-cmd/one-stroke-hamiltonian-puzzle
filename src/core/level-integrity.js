import { coordKey, getBlockedSet, getPlayableCount, inBounds } from "./grid.js";

function moveByDirection(x, y, direction) {
  if (direction === "R") {
    return [x + 1, y];
  }
  if (direction === "L") {
    return [x - 1, y];
  }
  if (direction === "D") {
    return [x, y + 1];
  }
  if (direction === "U") {
    return [x, y - 1];
  }
  return null;
}

export function validateLevelStructure(level) {
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height)) {
    return { ok: false, reason: "Invalid board dimensions" };
  }
  if (level.width < 2 || level.height < 2) {
    return { ok: false, reason: "Board too small" };
  }
  if (!Array.isArray(level.blocked)) {
    return { ok: false, reason: "Blocked nodes must be an array" };
  }
  if (!Array.isArray(level.start) || level.start.length !== 2) {
    return { ok: false, reason: "Start coordinate is invalid" };
  }
  if (!inBounds(level, level.start[0], level.start[1])) {
    return { ok: false, reason: "Start is outside board bounds" };
  }

  const blockedSet = getBlockedSet(level);
  const startKey = coordKey(level.start[0], level.start[1]);
  if (blockedSet.has(startKey)) {
    return { ok: false, reason: "Start node is blocked" };
  }

  if (level.endMode === "fixed") {
    if (!Array.isArray(level.end) || level.end.length !== 2) {
      return { ok: false, reason: "Fixed-end level missing valid end coordinate" };
    }
    if (!inBounds(level, level.end[0], level.end[1])) {
      return { ok: false, reason: "End is outside board bounds" };
    }
    const endKey = coordKey(level.end[0], level.end[1]);
    if (blockedSet.has(endKey)) {
      return { ok: false, reason: "End node is blocked" };
    }
  }

  const playableCount = getPlayableCount(level);
  if (playableCount <= 1) {
    return { ok: false, reason: "Level has too few playable nodes" };
  }

  if (level.par !== playableCount - 1) {
    return { ok: false, reason: "Par does not match playable nodes" };
  }

  if (typeof level.solution !== "string" || level.solution.length !== level.par) {
    return { ok: false, reason: "Solution string length must match par" };
  }

  return { ok: true };
}

export function validateLevelBySolution(level) {
  const baseCheck = validateLevelStructure(level);
  if (!baseCheck.ok) {
    return baseCheck;
  }

  const blockedSet = getBlockedSet(level);
  const visited = new Set();
  let x = level.start[0];
  let y = level.start[1];
  visited.add(coordKey(x, y));

  for (const direction of level.solution) {
    const next = moveByDirection(x, y, direction);
    if (!next) {
      return { ok: false, reason: `Unknown move '${direction}' in solution` };
    }

    [x, y] = next;
    if (!inBounds(level, x, y)) {
      return { ok: false, reason: "Solution leaves board bounds" };
    }

    const key = coordKey(x, y);
    if (blockedSet.has(key)) {
      return { ok: false, reason: "Solution enters blocked node" };
    }
    if (visited.has(key)) {
      return { ok: false, reason: "Solution revisits node" };
    }
    visited.add(key);
  }

  const playableCount = getPlayableCount(level);
  if (visited.size !== playableCount) {
    return {
      ok: false,
      reason: `Solution covers ${visited.size} nodes, expected ${playableCount}`,
    };
  }

  if (level.endMode === "fixed") {
    const endKey = coordKey(level.end[0], level.end[1]);
    const finalKey = coordKey(x, y);
    if (finalKey !== endKey) {
      return { ok: false, reason: "Solution does not end at the fixed endpoint" };
    }
  }

  return { ok: true };
}

export function validateCampaignLevels(levels) {
  const issues = [];
  const seenIds = new Set();

  for (const level of levels) {
    if (seenIds.has(level.id)) {
      issues.push({ id: level.id, reason: "Duplicate id" });
      continue;
    }
    seenIds.add(level.id);

    const result = validateLevelBySolution(level);
    if (!result.ok) {
      issues.push({ id: level.id, reason: result.reason });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}
