/**
 * Anti-cheat plausibility checks for challenge/match results.
 *
 * These run client-side as a first gate and are designed to be
 * mirrored server-side. They catch obviously tampered results
 * without needing replay verification.
 *
 * Each check returns { ok, flags[] }. Flags are advisory —
 * a single flag doesn't necessarily mean cheating, but multiple
 * flags on the same run warrant investigation.
 */

// ── Thresholds ──────────────────────────────────────────────

// Minimum plausible ms per node visited (even a god-tier player
// needs ~120ms per node for drag + process time).
const MIN_MS_PER_NODE = 100;

// Absolute floor: no level can be solved faster than this.
const MIN_LEVEL_MS = 800;

// If a player finishes a level faster than par * this factor (ms),
// flag it. For a 15-node level at 180ms/node = 2700ms.
const FAST_PACE_MS_PER_NODE = 180;

// Maximum plausible undo ratio (undo / nodeCount).
// More than 10x the nodes in undos is suspicious automation.
const MAX_UNDO_RATIO = 10;

// Maximum plausible resets per level.
const MAX_RESETS_PER_LEVEL = 50;

// A full 10-level run under this time (ms) is implausible.
const MIN_FULL_RUN_MS = 15_000;

// Maximum gap between two consecutive events (ms).
// If a player "pauses" for more than 24h mid-run, flag it.
const MAX_EVENT_GAP_MS = 24 * 60 * 60 * 1000;

// Move count must equal par (nodeCount - 1) for a valid solve.
// Any other value means tampered data.

// ── Single level check ──────────────────────────────────────

export function checkLevelResult(result, levelMeta) {
  const flags = [];

  const nodeCount = Number(levelMeta.nodeCount ?? levelMeta.par + 1) || 0;
  const par = Number(levelMeta.par) || 0;
  const durationMs = Number(result.durationMs) || 0;
  const undoCount = Number(result.undoCount) || 0;
  const resetCount = Number(result.resetCount) || 0;
  const hintCount = Number(result.hintCount) || 0;
  const moveCount = Number(result.moveCount) || 0;

  // Time floor
  if (durationMs < MIN_LEVEL_MS) {
    flags.push({
      code: "TIME_FLOOR",
      message: `Level completed in ${durationMs}ms, below absolute minimum ${MIN_LEVEL_MS}ms.`,
      severity: "critical",
    });
  }

  // Time per node
  if (nodeCount > 0 && durationMs > 0) {
    const msPerNode = durationMs / nodeCount;
    if (msPerNode < MIN_MS_PER_NODE) {
      flags.push({
        code: "TIME_PER_NODE",
        message: `${Math.round(msPerNode)}ms/node is below plausible minimum ${MIN_MS_PER_NODE}ms/node.`,
        severity: "critical",
      });
    } else if (msPerNode < FAST_PACE_MS_PER_NODE) {
      flags.push({
        code: "FAST_PACE",
        message: `${Math.round(msPerNode)}ms/node is unusually fast.`,
        severity: "warning",
      });
    }
  }

  // Move count mismatch
  if (moveCount > 0 && par > 0 && moveCount !== par) {
    flags.push({
      code: "MOVE_COUNT_MISMATCH",
      message: `Move count ${moveCount} does not match par ${par}.`,
      severity: "critical",
    });
  }

  // Excessive undo
  if (nodeCount > 0 && undoCount > nodeCount * MAX_UNDO_RATIO) {
    flags.push({
      code: "EXCESSIVE_UNDO",
      message: `${undoCount} undos for ${nodeCount} nodes exceeds ratio ${MAX_UNDO_RATIO}x.`,
      severity: "warning",
    });
  }

  // Excessive resets
  if (resetCount > MAX_RESETS_PER_LEVEL) {
    flags.push({
      code: "EXCESSIVE_RESET",
      message: `${resetCount} resets exceeds maximum ${MAX_RESETS_PER_LEVEL}.`,
      severity: "warning",
    });
  }

  // Negative or zero duration with completion
  if (durationMs <= 0) {
    flags.push({
      code: "INVALID_DURATION",
      message: "Duration is zero or negative.",
      severity: "critical",
    });
  }

  // Negative counts
  if (undoCount < 0 || resetCount < 0 || hintCount < 0) {
    flags.push({
      code: "NEGATIVE_COUNTS",
      message: "Action counts cannot be negative.",
      severity: "critical",
    });
  }

  const hasCritical = flags.some((f) => f.severity === "critical");
  return {
    ok: !hasCritical,
    flags,
  };
}

// ── Full run check ──────────────────────────────────────────

export function checkRunResult(run) {
  const flags = [];

  const totalTimeMs = Number(run.totalTimeMs) || 0;
  const completedCount = Number(run.completedCount) || 0;
  const totalLevels = Number(run.totalLevels) || 0;

  // Full run time floor
  if (completedCount >= totalLevels && totalLevels > 0 && totalTimeMs < MIN_FULL_RUN_MS) {
    flags.push({
      code: "RUN_TIME_FLOOR",
      message: `Full ${totalLevels}-level run in ${totalTimeMs}ms is below minimum ${MIN_FULL_RUN_MS}ms.`,
      severity: "critical",
    });
  }

  // Check individual splits
  const splits = Array.isArray(run.splits) ? run.splits : [];
  const levelFlags = [];
  for (const split of splits) {
    if (!split.completed) {
      continue;
    }
    const levelMeta = {
      nodeCount: (Number(split.par) || 0) + 1,
      par: Number(split.par) || 0,
    };
    const levelCheck = checkLevelResult(split, levelMeta);
    if (!levelCheck.ok || levelCheck.flags.length > 0) {
      levelFlags.push({
        levelId: split.levelId,
        levelIndex: split.index,
        flags: levelCheck.flags,
      });
    }
  }

  if (levelFlags.length > 0) {
    flags.push({
      code: "LEVEL_FLAGS",
      message: `${levelFlags.length} level(s) flagged.`,
      severity: levelFlags.some((lf) => lf.flags.some((f) => f.severity === "critical"))
        ? "critical"
        : "warning",
      details: levelFlags,
    });
  }

  const hasCritical = flags.some((f) => f.severity === "critical");
  return {
    ok: !hasCritical,
    flags,
  };
}

// ── Event sequence check ────────────────────────────────────

export function checkEventSequence(events) {
  const flags = [];

  if (!Array.isArray(events) || events.length === 0) {
    return { ok: true, flags };
  }

  // Check chronological order
  for (let i = 1; i < events.length; i += 1) {
    const prev = new Date(events[i - 1].timestamp).getTime();
    const curr = new Date(events[i].timestamp).getTime();
    if (curr < prev) {
      flags.push({
        code: "OUT_OF_ORDER",
        message: `Event ${i} timestamp is before event ${i - 1}.`,
        severity: "critical",
      });
    }
    if (curr - prev > MAX_EVENT_GAP_MS) {
      flags.push({
        code: "LARGE_GAP",
        message: `${Math.round((curr - prev) / 3600000)}h gap between events ${i - 1} and ${i}.`,
        severity: "warning",
      });
    }
  }

  // Check that each level-finish has a preceding level-start
  const startedLevels = new Set();
  for (const event of events) {
    if (event.type === "level-start") {
      startedLevels.add(event.levelIndex);
    }
    if (event.type === "level-finish" && !startedLevels.has(event.levelIndex)) {
      flags.push({
        code: "FINISH_WITHOUT_START",
        message: `Level ${event.levelIndex} finished without a start event.`,
        severity: "critical",
      });
    }
  }

  // Check for duplicate finishes on the same level
  const finishedLevels = new Set();
  for (const event of events) {
    if (event.type === "level-finish") {
      if (finishedLevels.has(event.levelIndex)) {
        flags.push({
          code: "DUPLICATE_FINISH",
          message: `Level ${event.levelIndex} finished more than once.`,
          severity: "warning",
        });
      }
      finishedLevels.add(event.levelIndex);
    }
  }

  const hasCritical = flags.some((f) => f.severity === "critical");
  return {
    ok: !hasCritical,
    flags,
  };
}

// ── Combined match validation ───────────────────────────────

export function validateMatchResults(match) {
  const allFlags = [];

  for (const player of Object.values(match.players ?? {})) {
    const eventCheck = checkEventSequence(player.events);
    if (eventCheck.flags.length > 0) {
      allFlags.push({
        playerId: player.playerId,
        source: "events",
        flags: eventCheck.flags,
      });
    }

    // Build a pseudo-run from the player's events for run-level checks
    const finishEvents = player.events.filter((e) => e.type === "level-finish");
    if (finishEvents.length > 0) {
      const pseudoRun = {
        totalTimeMs: player.totalTimeMs,
        completedCount: player.completedCount,
        totalLevels: match.levelCount,
        splits: finishEvents.map((e) => ({
          index: e.levelIndex,
          levelId: e.levelId,
          completed: true,
          durationMs: e.durationMs,
          par: (match.levels.find((l) => l.levelId === e.levelId)?.par) ?? 0,
          undoCount: e.undoCount,
          resetCount: e.resetCount,
          hintCount: e.hintCount,
          moveCount: e.moveCount,
          score: e.score,
        })),
      };
      const runCheck = checkRunResult(pseudoRun);
      if (runCheck.flags.length > 0) {
        allFlags.push({
          playerId: player.playerId,
          source: "run",
          flags: runCheck.flags,
        });
      }
    }
  }

  const hasCritical = allFlags.some(
    (pf) => pf.flags.some((f) => f.severity === "critical"),
  );
  return {
    ok: !hasCritical,
    playerFlags: allFlags,
  };
}
