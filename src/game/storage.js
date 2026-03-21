const STORAGE_KEYS = {
  campaignProgress: "one-stroke-campaign-progress-v2",
  challengeRunHistory: "one-stroke-challenge-run-history-v1",
  achievementUnlocks: "one-stroke-achievement-unlocks-v1",
};

export function loadCampaignProgress(defaultUnlockedLevel = 1) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.campaignProgress);
    if (!raw) {
      return { unlockedLevel: defaultUnlockedLevel, solvedLevels: {} };
    }
    const parsed = JSON.parse(raw);
    const unlockedLevel = Number(parsed.unlockedLevel);
    const solvedLevels = typeof parsed.solvedLevels === "object" && parsed.solvedLevels !== null
      ? parsed.solvedLevels
      : {};
    if (!Number.isInteger(unlockedLevel) || unlockedLevel < 1) {
      return { unlockedLevel: defaultUnlockedLevel, solvedLevels: {} };
    }
    return { unlockedLevel, solvedLevels };
  } catch {
    return { unlockedLevel: defaultUnlockedLevel, solvedLevels: {} };
  }
}

export function saveCampaignProgress(progress) {
  localStorage.setItem(STORAGE_KEYS.campaignProgress, JSON.stringify(progress));
}

function sanitizeChallengeRunEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const safeSplits = Array.isArray(entry.splits)
    ? entry.splits
        .map((split) => ({
          index: Number(split?.index) || 0,
          levelId: String(split?.levelId ?? ""),
          levelName: String(split?.levelName ?? ""),
          difficulty: String(split?.difficulty ?? ""),
          completed: Boolean(split?.completed),
          timeMs: Number.isFinite(split?.timeMs) ? Number(split.timeMs) : null,
          undoCount: Number(split?.undoCount) || 0,
          resetCount: Number(split?.resetCount) || 0,
          hintCount: Number(split?.hintCount) || 0,
          score: Number(split?.score) || 0,
        }))
        .filter((split) => split.levelId.length > 0)
    : [];

  return {
    id: String(entry.id ?? ""),
    seed: String(entry.seed ?? ""),
    startedAt: String(entry.startedAt ?? ""),
    finishedAt: String(entry.finishedAt ?? ""),
    completedCount: Number(entry.completedCount) || 0,
    totalLevels: Number(entry.totalLevels) || 0,
    totalScore: Number(entry.totalScore) || 0,
    totalTimeMs: Number(entry.totalTimeMs) || 0,
    averageSplitMs: Number.isFinite(entry.averageSplitMs) ? Number(entry.averageSplitMs) : null,
    undoCount: Number(entry.undoCount) || 0,
    resetCount: Number(entry.resetCount) || 0,
    hintCount: Number(entry.hintCount) || 0,
    splits: safeSplits,
  };
}

export function loadChallengeRunHistory(limit = 20) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.challengeRunHistory);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((entry) => sanitizeChallengeRunEntry(entry))
      .filter(Boolean)
      .slice(0, Math.max(1, limit));
  } catch {
    return [];
  }
}

export function saveChallengeRunHistory(entries, limit = 20) {
  const sanitized = Array.isArray(entries)
    ? entries
        .map((entry) => sanitizeChallengeRunEntry(entry))
        .filter(Boolean)
        .slice(0, Math.max(1, limit))
    : [];
  localStorage.setItem(STORAGE_KEYS.challengeRunHistory, JSON.stringify(sanitized));
}

export function loadAchievementUnlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.achievementUnlocks);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, value]) => typeof key === "string" && Boolean(value)),
    );
  } catch {
    return {};
  }
}

export function saveAchievementUnlocks(unlocks) {
  const safeUnlocks = unlocks && typeof unlocks === "object"
    ? Object.fromEntries(
        Object.entries(unlocks).filter(([key, value]) => typeof key === "string" && Boolean(value)),
      )
    : {};
  localStorage.setItem(STORAGE_KEYS.achievementUnlocks, JSON.stringify(safeUnlocks));
}
