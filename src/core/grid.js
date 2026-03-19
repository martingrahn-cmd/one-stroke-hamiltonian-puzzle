export function coordKey(x, y) {
  return `${x},${y}`;
}

export function parseKey(key) {
  return key.split(",").map(Number);
}

export function inBounds(level, x, y) {
  return x >= 0 && x < level.width && y >= 0 && y < level.height;
}

export function getBlockedSet(level) {
  return new Set(level.blocked.map(([x, y]) => coordKey(x, y)));
}

export function getPlayableCount(level) {
  return level.width * level.height - level.blocked.length;
}

export function getAllPlayableKeys(level) {
  const blocked = getBlockedSet(level);
  const result = [];
  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      const key = coordKey(x, y);
      if (!blocked.has(key)) {
        result.push(key);
      }
    }
  }
  return result;
}

export function getNeighborKeys(level, blockedSet, key) {
  const [x, y] = parseKey(key);
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const neighbors = [];

  for (const [dx, dy] of deltas) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(level, nx, ny)) {
      continue;
    }
    const nextKey = coordKey(nx, ny);
    if (!blockedSet.has(nextKey)) {
      neighbors.push(nextKey);
    }
  }

  return neighbors;
}

export function directionBetweenKeys(fromKey, toKey) {
  const [fromX, fromY] = parseKey(fromKey);
  const [toX, toY] = parseKey(toKey);
  const dx = toX - fromX;
  const dy = toY - fromY;

  if (dx === 1 && dy === 0) {
    return "R";
  }
  if (dx === -1 && dy === 0) {
    return "L";
  }
  if (dx === 0 && dy === 1) {
    return "D";
  }
  if (dx === 0 && dy === -1) {
    return "U";
  }
  return null;
}
