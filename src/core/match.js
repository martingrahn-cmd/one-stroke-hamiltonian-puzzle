/**
 * Match object for async multiplayer.
 *
 * A match is a fixed set of 10 levels derived from a seed.
 * Two (or more) players play the same levels independently
 * within a time window. Results are compared after both finish.
 *
 * Schema version: 1
 */

import { createRng, hashStringToSeed } from "./rng.js";

const MATCH_SCHEMA_VERSION = 1;
const MATCH_KIND = "one-stroke.match";
const DEFAULT_WINDOW_HOURS = 72;
const LEVELS_PER_MATCH = 10;

// ── Match creation ──────────────────────────────────────────

export function createMatch(options = {}) {
  const {
    seed,
    levels,
    createdBy = null,
    windowHours = DEFAULT_WINDOW_HOURS,
  } = options;

  if (!seed || typeof seed !== "string") {
    throw new Error("Match requires a non-empty seed string.");
  }
  if (!Array.isArray(levels) || levels.length !== LEVELS_PER_MATCH) {
    throw new Error(`Match requires exactly ${LEVELS_PER_MATCH} levels.`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  const matchId = generateMatchId(seed, now);

  const levelManifest = levels.map((level, index) => ({
    index: index + 1,
    levelId: level.id,
    levelName: level.name,
    difficulty: level.difficulty,
    width: level.width,
    height: level.height,
    par: level.par,
    nodeCount: level.width * level.height - level.blocked.length,
  }));

  return {
    schemaVersion: MATCH_SCHEMA_VERSION,
    kind: MATCH_KIND,
    matchId,
    seed,
    createdAt: now.toISOString(),
    createdBy,
    expiresAt: expiresAt.toISOString(),
    windowHours,
    status: "open",
    levelCount: LEVELS_PER_MATCH,
    levels: levelManifest,
    players: {},
  };
}

function generateMatchId(seed, date) {
  const dateStr = date.toISOString().slice(0, 10);
  const rng = createRng(hashStringToSeed(`${seed}-${dateStr}-${date.getTime()}`));
  const hex = Math.floor(rng() * 0xffffffff).toString(16).padStart(8, "0");
  return `match-${dateStr}-${hex}`;
}

// ── Player join ─────────────────────────────────────────────

export function addPlayerToMatch(match, playerId) {
  if (!playerId || typeof playerId !== "string") {
    throw new Error("playerId must be a non-empty string.");
  }
  if (match.players[playerId]) {
    return match;
  }
  if (isMatchExpired(match)) {
    throw new Error("Cannot join an expired match.");
  }

  match.players[playerId] = {
    playerId,
    joinedAt: new Date().toISOString(),
    status: "playing",
    events: [],
    completedCount: 0,
    totalScore: 0,
    totalTimeMs: 0,
    totalUndoCount: 0,
    totalResetCount: 0,
    totalHintCount: 0,
    finishedAt: null,
  };

  return match;
}

// ── Event logging ───────────────────────────────────────────

const EVENT_TYPES = new Set(["level-start", "level-finish", "level-skip"]);

export function logMatchEvent(match, playerId, event) {
  const player = match.players[playerId];
  if (!player) {
    throw new Error(`Player ${playerId} is not in this match.`);
  }
  if (player.status === "finished") {
    throw new Error("Player has already finished this match.");
  }
  if (!EVENT_TYPES.has(event.type)) {
    throw new Error(`Unknown event type: ${event.type}`);
  }

  const entry = {
    type: event.type,
    timestamp: new Date().toISOString(),
    levelIndex: Number(event.levelIndex) || 0,
    levelId: String(event.levelId ?? ""),
  };

  if (event.type === "level-start") {
    entry.attemptNumber = Number(event.attemptNumber) || 1;
  }

  if (event.type === "level-finish") {
    entry.durationMs = Number(event.durationMs) || 0;
    entry.undoCount = Number(event.undoCount) || 0;
    entry.resetCount = Number(event.resetCount) || 0;
    entry.hintCount = Number(event.hintCount) || 0;
    entry.moveCount = Number(event.moveCount) || 0;
    entry.score = Number(event.score) || 0;
    entry.firstAttempt = Boolean(event.firstAttempt);
  }

  player.events.push(entry);

  if (event.type === "level-finish") {
    player.completedCount += 1;
    player.totalScore += entry.score;
    player.totalTimeMs += entry.durationMs;
    player.totalUndoCount += entry.undoCount;
    player.totalResetCount += entry.resetCount;
    player.totalHintCount += entry.hintCount;
  }

  if (player.completedCount >= match.levelCount) {
    player.status = "finished";
    player.finishedAt = entry.timestamp;
  }

  updateMatchStatus(match);
  return entry;
}

// ── Match status ────────────────────────────────────────────

export function isMatchExpired(match) {
  if (!match.expiresAt) {
    return false;
  }
  return new Date() > new Date(match.expiresAt);
}

function updateMatchStatus(match) {
  const playerList = Object.values(match.players);
  if (playerList.length === 0) {
    match.status = "open";
    return;
  }
  const allFinished = playerList.length >= 2 && playerList.every((p) => p.status === "finished");
  if (allFinished) {
    match.status = "completed";
  } else if (isMatchExpired(match)) {
    match.status = "expired";
  } else {
    match.status = "in-progress";
  }
}

// ── Standings ───────────────────────────────────────────────

export function getMatchStandings(match) {
  const playerList = Object.values(match.players);
  if (playerList.length === 0) {
    return [];
  }

  const standings = playerList.map((player) => ({
    playerId: player.playerId,
    status: player.status,
    completedCount: player.completedCount,
    totalScore: player.totalScore,
    totalTimeMs: player.totalTimeMs,
    totalUndoCount: player.totalUndoCount,
    totalResetCount: player.totalResetCount,
    totalHintCount: player.totalHintCount,
    finishedAt: player.finishedAt,
  }));

  standings.sort((a, b) => {
    const scoreDiff = b.totalScore - a.totalScore;
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    return a.totalTimeMs - b.totalTimeMs;
  });

  standings.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return standings;
}

// ── Per-level comparison ────────────────────────────────────

export function getLevelComparison(match, levelIndex) {
  const results = [];
  for (const player of Object.values(match.players)) {
    const finishEvent = player.events.find(
      (e) => e.type === "level-finish" && e.levelIndex === levelIndex,
    );
    if (finishEvent) {
      results.push({
        playerId: player.playerId,
        durationMs: finishEvent.durationMs,
        undoCount: finishEvent.undoCount,
        resetCount: finishEvent.resetCount,
        hintCount: finishEvent.hintCount,
        score: finishEvent.score,
        firstAttempt: finishEvent.firstAttempt,
      });
    } else {
      results.push({
        playerId: player.playerId,
        durationMs: null,
        undoCount: 0,
        resetCount: 0,
        hintCount: 0,
        score: 0,
        firstAttempt: false,
      });
    }
  }

  results.sort((a, b) => (b.score || 0) - (a.score || 0));
  return results;
}

// ── Serialization ───────────────────────────────────────────

export function serializeMatch(match) {
  return JSON.parse(JSON.stringify(match));
}

export function validateMatchStructure(data) {
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "Match data must be an object." };
  }
  if (data.schemaVersion !== MATCH_SCHEMA_VERSION) {
    return { ok: false, reason: `Expected schema version ${MATCH_SCHEMA_VERSION}, got ${data.schemaVersion}.` };
  }
  if (data.kind !== MATCH_KIND) {
    return { ok: false, reason: `Expected kind '${MATCH_KIND}', got '${data.kind}'.` };
  }
  if (!data.matchId || typeof data.matchId !== "string") {
    return { ok: false, reason: "Missing or invalid matchId." };
  }
  if (!data.seed || typeof data.seed !== "string") {
    return { ok: false, reason: "Missing or invalid seed." };
  }
  if (!Array.isArray(data.levels) || data.levels.length !== LEVELS_PER_MATCH) {
    return { ok: false, reason: `Match must have exactly ${LEVELS_PER_MATCH} levels.` };
  }
  return { ok: true };
}
