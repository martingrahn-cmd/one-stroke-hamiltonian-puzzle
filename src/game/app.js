import {
  CAMPAIGN_LEVELS,
  CAMPAIGN_TOTAL_LEVELS,
} from "../data/campaign-levels.js";
import { DIFFICULTY_META } from "../data/difficulty.js";
import {
  coordKey,
  directionBetweenKeys,
  getAllPlayableKeys,
  getBlockedSet,
  getNeighborKeys,
  getPlayableCount,
  inBounds,
  parseKey,
} from "../core/grid.js";
import { validateCampaignLevels } from "../core/level-integrity.js";
import { createMixedChallenge } from "./challenge-pool.js";
import {
  loadAchievementUnlocks,
  loadCampaignProgress,
  loadChallengeRunHistory,
  saveAchievementUnlocks,
  saveCampaignProgress,
  saveChallengeRunHistory,
} from "./storage.js";

const LEVEL_FORMAT_VERSION = 2;
const CHALLENGE_DIFFICULTY_MULTIPLIER = {
  easy: 1,
  medium: 1.25,
  hard: 1.6,
  "very-hard": 2.05,
};
const CHALLENGE_HINT_PENALTY = 180;
const CHALLENGE_UNDO_PENALTY_SECONDS = 2.5;
const CHALLENGE_RESET_PENALTY_SECONDS = 7;
const CHALLENGE_HISTORY_LIMIT = 20;

const TROPHY_TIER_ORDER = ["bronze", "silver", "gold", "platinum"];
const TROPHY_TIER_META = {
  bronze: { label: "Brons", total: 15 },
  silver: { label: "Silver", total: 10 },
  gold: { label: "Guld", total: 5 },
  platinum: { label: "Platinum", total: 1 },
};
const TROPHY_CATALOG = [
  {
    id: "b01",
    tier: "bronze",
    name: "Första steget",
    description: "Lös 1 kampanjnivå.",
    check: (metrics) => metrics.campaignSolvedCount >= 1,
  },
  {
    id: "b02",
    tier: "bronze",
    name: "Femman",
    description: "Lös 5 kampanjnivåer.",
    check: (metrics) => metrics.campaignSolvedCount >= 5,
  },
  {
    id: "b03",
    tier: "bronze",
    name: "Tio avklarade",
    description: "Lös 10 kampanjnivåer.",
    check: (metrics) => metrics.campaignSolvedCount >= 10,
  },
  {
    id: "b04",
    tier: "bronze",
    name: "Tjugo avklarade",
    description: "Lös 20 kampanjnivåer.",
    check: (metrics) => metrics.campaignSolvedCount >= 20,
  },
  {
    id: "b05",
    tier: "bronze",
    name: "Trettio avklarade",
    description: "Lös 30 kampanjnivåer.",
    check: (metrics) => metrics.campaignSolvedCount >= 30,
  },
  {
    id: "b06",
    tier: "bronze",
    name: "10 spelade nivåer",
    description: "Nå 10 spelade kampanjnivå-försök totalt.",
    check: (metrics) => metrics.campaignPlayedCount >= 10,
  },
  {
    id: "b07",
    tier: "bronze",
    name: "25 spelade nivåer",
    description: "Nå 25 spelade kampanjnivå-försök totalt.",
    check: (metrics) => metrics.campaignPlayedCount >= 25,
  },
  {
    id: "b08",
    tier: "bronze",
    name: "Challenger",
    description: "Spara din första challenge-run.",
    check: (metrics) => metrics.challengeRunCount >= 1,
  },
  {
    id: "b09",
    tier: "bronze",
    name: "Första full run",
    description: "Slutför en hel 10-banors challenge.",
    check: (metrics) => metrics.completedChallengeCount >= 1,
  },
  {
    id: "b10",
    tier: "bronze",
    name: "Poäng 3k",
    description: "Nå minst 3 000 poäng i en challenge-run.",
    check: (metrics) => metrics.bestChallengeScore >= 3000,
  },
  {
    id: "b11",
    tier: "bronze",
    name: "Poäng 5k",
    description: "Nå minst 5 000 poäng i en challenge-run.",
    check: (metrics) => metrics.bestChallengeScore >= 5000,
  },
  {
    id: "b12",
    tier: "bronze",
    name: "Hintfri run",
    description: "Slutför en challenge-run utan hints.",
    check: (metrics) => metrics.noHintCompletedCount >= 1,
  },
  {
    id: "b13",
    tier: "bronze",
    name: "Resetfri run",
    description: "Slutför en challenge-run utan reset.",
    check: (metrics) => metrics.noResetCompletedCount >= 1,
  },
  {
    id: "b14",
    tier: "bronze",
    name: "Kontrollerad run",
    description: "Slutför en challenge-run med max 20 undo.",
    check: (metrics) => metrics.lowUndoCompletedCount >= 1,
  },
  {
    id: "b15",
    tier: "bronze",
    name: "50 spelade nivåer",
    description: "Nå 50 spelade kampanjnivå-försök totalt.",
    check: (metrics) => metrics.campaignPlayedCount >= 50,
  },
  {
    id: "s01",
    tier: "silver",
    name: "50 kampanjnivåer",
    description: "Lös 50 kampanjnivåer.",
    check: (metrics) => metrics.campaignSolvedCount >= 50,
  },
  {
    id: "s02",
    tier: "silver",
    name: "75 kampanjnivåer",
    description: "Lös 75 kampanjnivåer.",
    check: (metrics) => metrics.campaignSolvedCount >= 75,
  },
  {
    id: "s03",
    tier: "silver",
    name: "100 kampanjnivåer",
    description: "Lös 100 kampanjnivåer.",
    check: (metrics) => metrics.campaignSolvedCount >= 100,
  },
  {
    id: "s04",
    tier: "silver",
    name: "150 kampanjnivåer",
    description: "Lös 150 kampanjnivåer.",
    check: (metrics) => metrics.campaignSolvedCount >= 150,
  },
  {
    id: "s05",
    tier: "silver",
    name: "3 fulla challenges",
    description: "Slutför 3 hela challenge-runs.",
    check: (metrics) => metrics.completedChallengeCount >= 3,
  },
  {
    id: "s06",
    tier: "silver",
    name: "5 fulla challenges",
    description: "Slutför 5 hela challenge-runs.",
    check: (metrics) => metrics.completedChallengeCount >= 5,
  },
  {
    id: "s07",
    tier: "silver",
    name: "Poäng 8k",
    description: "Nå minst 8 000 poäng i en challenge-run.",
    check: (metrics) => metrics.bestChallengeScore >= 8000,
  },
  {
    id: "s08",
    tier: "silver",
    name: "Poäng 10k",
    description: "Nå minst 10 000 poäng i en challenge-run.",
    check: (metrics) => metrics.bestChallengeScore >= 10000,
  },
  {
    id: "s09",
    tier: "silver",
    name: "Snabb run",
    description: "Slutför en challenge-run under 6:00.",
    check: (metrics) => Number.isFinite(metrics.bestChallengeTimeMs) && metrics.bestChallengeTimeMs <= 360_000,
  },
  {
    id: "s10",
    tier: "silver",
    name: "No safety net",
    description: "Slutför en challenge-run utan hint och reset.",
    check: (metrics) => metrics.noHintNoResetCompletedCount >= 1,
  },
  {
    id: "g01",
    tier: "gold",
    name: "Kampanj 200",
    description: "Lös alla 200 kampanjnivåer.",
    check: (metrics) => metrics.campaignSolvedCount >= CAMPAIGN_TOTAL_LEVELS,
  },
  {
    id: "g02",
    tier: "gold",
    name: "10 fulla challenges",
    description: "Slutför 10 hela challenge-runs.",
    check: (metrics) => metrics.completedChallengeCount >= 10,
  },
  {
    id: "g03",
    tier: "gold",
    name: "Poäng 12k",
    description: "Nå minst 12 000 poäng i en challenge-run.",
    check: (metrics) => metrics.bestChallengeScore >= 12000,
  },
  {
    id: "g04",
    tier: "gold",
    name: "Elittempo",
    description: "Slutför en challenge-run under 4:30.",
    check: (metrics) => Number.isFinite(metrics.bestChallengeTimeMs) && metrics.bestChallengeTimeMs <= 270_000,
  },
  {
    id: "g05",
    tier: "gold",
    name: "Perfekt run",
    description: "Slutför en challenge-run med 0 hint, 0 reset och 0 undo.",
    check: (metrics) => metrics.perfectCompletedCount >= 1,
  },
  {
    id: "p01",
    tier: "platinum",
    name: "Platinum Path",
    description: "Lås upp alla andra trophies.",
    check: null,
  },
];

const trophyDistribution = TROPHY_CATALOG.reduce((acc, trophy) => {
  acc[trophy.tier] = (acc[trophy.tier] ?? 0) + 1;
  return acc;
}, {});
if (
  trophyDistribution.bronze !== TROPHY_TIER_META.bronze.total ||
  trophyDistribution.silver !== TROPHY_TIER_META.silver.total ||
  trophyDistribution.gold !== TROPHY_TIER_META.gold.total ||
  trophyDistribution.platinum !== TROPHY_TIER_META.platinum.total
) {
  throw new Error("Trophy catalog must contain 15 bronze, 10 silver, 5 gold and 1 platinum.");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function todaySeed() {
  return new Date().toISOString().slice(0, 10);
}

function toDisplayTime(ms) {
  if (!Number.isFinite(ms)) {
    return "--";
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function toDisplayScore(value) {
  return new Intl.NumberFormat("sv-SE").format(Math.round(value));
}

function toDisplayPenaltySeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "+0.0s";
  }
  const formatted = new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(seconds);
  return `+${formatted}s`;
}

function toDisplayDateTime(iso) {
  if (!iso) {
    return "--";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export class OneStrokeApp {
  constructor() {
    this.validateCampaignData();

    this.boardEl = document.getElementById("board");
    this.boardStageEl = this.boardEl?.closest(".board-stage") ?? null;
    this.levelNameEl = document.getElementById("levelName");
    this.levelLabelEl = document.getElementById("levelLabel");
    this.difficultyLabelEl = document.getElementById("difficultyLabel");
    this.campaignProgressLabelEl = document.getElementById("campaignProgressLabel");
    this.visitedLabelEl = document.getElementById("visitedLabel");
    this.remainingLabelEl = document.getElementById("remainingLabel");
    this.phaseLabelEl = document.getElementById("phaseLabel");
    this.statusBoxEl = document.getElementById("statusBox");
    this.levelListEl = document.getElementById("levelList");
    this.openLevelSelectBtn = document.getElementById("openLevelSelectBtn");
    this.undoBtn = document.getElementById("undoBtn");
    this.resetBtn = document.getElementById("resetBtn");
    this.hintBtn = document.getElementById("hintBtn");
    this.nextBtn = document.getElementById("nextBtn");
    this.winModalEl = document.getElementById("winModal");
    this.winTextEl = document.getElementById("winText");
    this.modalResetBtn = document.getElementById("modalResetBtn");
    this.modalNextBtn = document.getElementById("modalNextBtn");
    this.campaignModeBtn = document.getElementById("campaignModeBtn");
    this.challengeModeBtn = document.getElementById("challengeModeBtn");
    this.highScoreMenuBtn = document.getElementById("highScoreMenuBtn");
    this.achievementMenuBtn = document.getElementById("achievementMenuBtn");
    this.creditsMenuBtn = document.getElementById("creditsMenuBtn");
    this.playSidebarEl = document.getElementById("playSidebar");
    this.singlePlayerLevelSectionEl = document.getElementById("singlePlayerLevelSection");
    this.multiplayerPanelsEl = document.getElementById("multiplayerPanels");
    this.gameplayViewEl = document.getElementById("gameplayView");
    this.hubInfoViewEl = document.getElementById("hubInfoView");
    this.highScoreViewEl = document.getElementById("highScoreView");
    this.achievementViewEl = document.getElementById("achievementView");
    this.creditsViewEl = document.getElementById("creditsView");
    this.boardModeLabelEl = document.getElementById("boardModeLabel");
    this.highScoreBestChallengeScoreEl = document.getElementById("highScoreBestChallengeScore");
    this.highScoreBestChallengeTimeEl = document.getElementById("highScoreBestChallengeTime");
    this.highScoreCampaignSolvedEl = document.getElementById("highScoreCampaignSolved");
    this.highScoreRunCountEl = document.getElementById("highScoreRunCount");
    this.highScoreRunListEl = document.getElementById("highScoreRunList");
    this.achievementSummaryEl = document.getElementById("achievementSummary");
    this.achievementListEl = document.getElementById("achievementList");
    this.challengeSeedInput = document.getElementById("challengeSeedInput");
    this.challengeGenerateBtn = document.getElementById("challengeGenerateBtn");
    this.challengeMetaEl = document.getElementById("challengeMeta");
    this.challengeListEl = document.getElementById("challengeList");
    this.challengeScoreLabelEl = document.getElementById("challengeScoreLabel");
    this.challengeTimeLabelEl = document.getElementById("challengeTimeLabel");
    this.challengeCompletedLabelEl = document.getElementById("challengeCompletedLabel");
    this.challengeSplitListEl = document.getElementById("challengeSplitList");
    this.copyChallengeSummaryBtn = document.getElementById("copyChallengeSummaryBtn");
    this.exportChallengeSummaryBtn = document.getElementById("exportChallengeSummaryBtn");
    this.levelSelectModalEl = document.getElementById("levelSelectModal");
    this.levelSelectCloseBtn = document.getElementById("levelSelectCloseBtn");
    this.levelSelectSummaryEl = document.getElementById("levelSelectSummary");
    this.levelSelectSearchInput = document.getElementById("levelSelectSearchInput");
    this.levelSelectDifficultyFilter = document.getElementById("levelSelectDifficultyFilter");
    this.levelSelectStatusFilter = document.getElementById("levelSelectStatusFilter");
    this.levelSelectGridEl = document.getElementById("levelSelectGrid");

    this.cells = new Map();
    this.levelButtons = [];
    this.invalidTimer = null;
    this.drag = {
      active: false,
      pointerId: null,
      lastKey: null,
    };
    this.activeHintKey = null;
    this.solutionPathCache = new Map();
    this.hubView = "single-player";

    this.progress = loadCampaignProgress(1);
    this.progress.unlockedLevel = clamp(this.progress.unlockedLevel, 1, CAMPAIGN_TOTAL_LEVELS);
    if (!this.progress.solvedLevels || typeof this.progress.solvedLevels !== "object") {
      this.progress.solvedLevels = {};
    }

    this.campaignCursorIndex = clamp(this.progress.unlockedLevel - 1, 0, CAMPAIGN_TOTAL_LEVELS - 1);
    this.challenge = {
      seed: todaySeed(),
      levels: [],
      cursor: 0,
      resultsByLevelId: {},
    };
    this.challengeRunHistory = loadChallengeRunHistory(CHALLENGE_HISTORY_LIMIT);
    this.achievementUnlocks = loadAchievementUnlocks();
    this.challengeRunMeta = {
      startedAtMs: Date.now(),
      saved: false,
    };

    this.levelAttempt = {
      startedAtMs: Date.now(),
      undoCount: 0,
      resetCount: 0,
      hintCount: 0,
    };
    this.levelSelectFilters = {
      query: "",
      difficulty: "all",
      status: "all",
    };

    this.state = {
      mode: "campaign",
      levelSourceIndex: 0,
      level: null,
      blockedSet: new Set(),
      playableCount: 0,
      path: [],
      visited: new Set(),
      status: "playing",
    };

    this.createChallenge(todaySeed());
    this.bindEvents();
    this.loadCampaignLevel(this.campaignCursorIndex, { announce: false, bypassLock: true });
    this.renderChallengePanel();
    this.renderModeButtons();
    this.setHubView("single-player", { syncMode: false });
    this.setStatus("Dra från startnoden till en granne. Dra bakåt för att ångra.");
  }

  validateCampaignData() {
    if (CAMPAIGN_LEVELS.length !== CAMPAIGN_TOTAL_LEVELS) {
      throw new Error("Campaign level count metadata is out of sync.");
    }

    const validation = validateCampaignLevels(CAMPAIGN_LEVELS);
    if (!validation.ok) {
      const sample = validation.issues.slice(0, 3).map((item) => `${item.id}: ${item.reason}`).join(" | ");
      throw new Error(`Campaign data integrity failed: ${sample}`);
    }

    for (const level of CAMPAIGN_LEVELS) {
      if (level.formatVersion !== LEVEL_FORMAT_VERSION) {
        throw new Error(`Level ${level.id} has unexpected formatVersion ${level.formatVersion}`);
      }
      if (!DIFFICULTY_META[level.difficulty]) {
        throw new Error(`Level ${level.id} uses unknown difficulty '${level.difficulty}'`);
      }
    }
  }

  bindEvents() {
    this.undoBtn.addEventListener("click", () => this.undo());
    this.resetBtn.addEventListener("click", () => this.resetLevel());
    this.hintBtn.addEventListener("click", () => this.requestHint());
    this.nextBtn.addEventListener("click", () => this.goToNextLevel());
    this.modalResetBtn.addEventListener("click", () => {
      this.hideModal();
      this.resetLevel();
    });
    this.modalNextBtn.addEventListener("click", () => {
      this.hideModal();
      this.goToNextLevel();
    });

    this.campaignModeBtn.addEventListener("click", () => this.setHubView("single-player"));
    this.challengeModeBtn.addEventListener("click", () => this.setHubView("multiplayer"));
    this.highScoreMenuBtn?.addEventListener("click", () => this.setHubView("high-score"));
    this.achievementMenuBtn?.addEventListener("click", () => this.setHubView("achievement"));
    this.creditsMenuBtn?.addEventListener("click", () => this.setHubView("credit"));
    this.challengeGenerateBtn.addEventListener("click", () => {
      this.createChallenge(this.challengeSeedInput.value.trim());
      if (this.state.mode === "challenge") {
        this.loadChallengeLevel(0, { announce: true });
      } else {
        this.renderChallengePanel();
      }
    });
    this.copyChallengeSummaryBtn?.addEventListener("click", () => this.copyChallengeSummary());
    this.exportChallengeSummaryBtn?.addEventListener("click", () => this.exportChallengeSummary());
    this.openLevelSelectBtn?.addEventListener("click", () => this.openLevelSelect());
    this.levelSelectCloseBtn?.addEventListener("click", () => this.closeLevelSelect());
    this.levelSelectModalEl?.addEventListener("click", (event) => {
      if (event.target === this.levelSelectModalEl) {
        this.closeLevelSelect();
      }
    });
    this.levelSelectSearchInput?.addEventListener("input", () => {
      this.levelSelectFilters.query = this.levelSelectSearchInput.value.trim();
      this.renderFullLevelSelect();
    });
    this.levelSelectDifficultyFilter?.addEventListener("change", () => {
      this.levelSelectFilters.difficulty = this.levelSelectDifficultyFilter.value;
      this.renderFullLevelSelect();
    });
    this.levelSelectStatusFilter?.addEventListener("change", () => {
      this.levelSelectFilters.status = this.levelSelectStatusFilter.value;
      this.renderFullLevelSelect();
    });

    this.boardEl.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.boardEl.addEventListener("pointermove", (event) => this.onPointerMove(event));
    window.addEventListener("pointerup", (event) => this.onPointerUp(event));
    window.addEventListener("pointercancel", (event) => this.onPointerUp(event));

    document.addEventListener("keydown", (event) => this.onKeyDown(event));
  }

  setMode(mode) {
    if (mode === this.state.mode) {
      if (mode === "challenge") {
        this.setHubView("multiplayer", { syncMode: false });
      } else {
        this.setHubView("single-player", { syncMode: false });
      }
      return;
    }
    this.hideModal();
    this.stopDrag();

    if (mode === "challenge") {
      this.setHubView("multiplayer", { syncMode: false });
      if (this.challenge.levels.length === 0) {
        this.createChallenge(this.challengeSeedInput.value.trim() || todaySeed());
      }
      this.loadChallengeLevel(this.challenge.cursor, { announce: true });
    } else {
      this.setHubView("single-player", { syncMode: false });
      this.loadCampaignLevel(this.campaignCursorIndex, { announce: true, bypassLock: true });
    }
  }

  createChallenge(seedInput) {
    const challenge = createMixedChallenge(CAMPAIGN_LEVELS, seedInput);
    this.challenge = {
      seed: challenge.seed,
      levels: challenge.levels,
      cursor: 0,
      resultsByLevelId: {},
    };
    this.challengeRunMeta = {
      startedAtMs: Date.now(),
      saved: false,
    };
    if (this.challengeSeedInput) {
      this.challengeSeedInput.value = challenge.seed;
    }
    this.renderChallengePanel();
    this.renderHubPanels();
  }

  renderChallengePanel() {
    if (!this.challengeMetaEl || !this.challengeListEl) {
      return;
    }

    const completedCount = Object.keys(this.challenge.resultsByLevelId).length;
    this.challengeMetaEl.textContent =
      `Seed: ${this.challenge.seed} · ${completedCount}/${this.challenge.levels.length} klara`;

    this.challengeListEl.innerHTML = "";
    this.challenge.levels.forEach((level, index) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "challenge-pill";
      const diff = DIFFICULTY_META[level.difficulty];
      const solved = Boolean(this.challenge.resultsByLevelId[level.id]);
      pill.textContent = `${index + 1}. ${diff.shortLabel}`;
      pill.title = `${level.name} (${diff.label})`;
      pill.classList.toggle("solved", solved);
      pill.classList.toggle("active", this.state.mode === "challenge" && this.challenge.cursor === index);
      pill.addEventListener("click", () => {
        this.setMode("challenge");
        this.loadChallengeLevel(index, { announce: true });
      });
      this.challengeListEl.append(pill);
    });

    this.renderChallengeResults();
  }

  getChallengeSplitScore(level, result) {
    const difficultyMultiplier = CHALLENGE_DIFFICULTY_MULTIPLIER[level.difficulty] ?? 1;
    const rawSeconds = result.durationMs / 1000;
    const penaltySeconds = this.getPenaltySecondsForAttempt(result);
    const effectiveSeconds = Math.max(6, rawSeconds + penaltySeconds);
    const benchmarkSeconds = Math.max(28, level.par * 1.85);
    const paceRatio = benchmarkSeconds / effectiveSeconds;
    const base = 250 + 850 * paceRatio;
    const hintPenalty = (result.hintCount ?? 0) * CHALLENGE_HINT_PENALTY;
    return Math.max(60, Math.round(base * difficultyMultiplier - hintPenalty));
  }

  getPenaltySecondsForAttempt(attempt) {
    const undoCount = attempt?.undoCount ?? 0;
    const resetCount = attempt?.resetCount ?? 0;
    return undoCount * CHALLENGE_UNDO_PENALTY_SECONDS + resetCount * CHALLENGE_RESET_PENALTY_SECONDS;
  }

  getChallengeSummary() {
    const splits = this.challenge.levels.map((level, index) => {
      const result = this.challenge.resultsByLevelId[level.id] ?? null;
      const penaltySeconds = result ? this.getPenaltySecondsForAttempt(result) : 0;
      const score = result ? this.getChallengeSplitScore(level, result) : 0;
      return {
        index: index + 1,
        levelId: level.id,
        levelName: level.name,
        difficulty: level.difficulty,
        par: level.par,
        completed: Boolean(result),
        timeMs: result?.durationMs ?? null,
        undoCount: result?.undoCount ?? 0,
        resetCount: result?.resetCount ?? 0,
        hintCount: result?.hintCount ?? 0,
        penaltySeconds,
        score,
      };
    });

    const completedSplits = splits.filter((split) => split.completed);
    const totalScore = completedSplits.reduce((sum, split) => sum + split.score, 0);
    const totalTimeMs = completedSplits.reduce((sum, split) => sum + split.timeMs, 0);
    const totalPenaltySeconds = completedSplits.reduce((sum, split) => sum + split.penaltySeconds, 0);
    const completedCount = completedSplits.length;

    return {
      seed: this.challenge.seed,
      totalLevels: this.challenge.levels.length,
      completedCount,
      totalScore,
      totalTimeMs,
      totalPenaltySeconds,
      averageSplitMs: completedCount > 0 ? Math.round(totalTimeMs / completedCount) : null,
      splits,
    };
  }

  renderChallengeResults() {
    if (
      !this.challengeScoreLabelEl ||
      !this.challengeTimeLabelEl ||
      !this.challengeCompletedLabelEl ||
      !this.challengeSplitListEl
    ) {
      return;
    }

    const summary = this.getChallengeSummary();
    this.challengeScoreLabelEl.textContent = toDisplayScore(summary.totalScore);
    this.challengeTimeLabelEl.textContent = toDisplayTime(summary.totalTimeMs);
    this.challengeCompletedLabelEl.textContent = `${summary.completedCount} / ${summary.totalLevels}`;

    this.challengeSplitListEl.innerHTML = "";
    for (const split of summary.splits) {
      const diff = DIFFICULTY_META[split.difficulty];
      const row = document.createElement("article");
      row.className = "split-row";
      row.classList.toggle("done", split.completed);

      const title = document.createElement("div");
      title.className = "split-title";
      title.textContent = `${split.index}. ${diff.shortLabel} · ${split.levelName}`;

      const meta = document.createElement("div");
      meta.className = "split-meta";
      if (split.completed) {
        meta.textContent =
          `${toDisplayTime(split.timeMs)} · U:${split.undoCount} R:${split.resetCount} H:${split.hintCount} · ${toDisplayScore(split.score)} p`;
      } else {
        meta.textContent = "Inte klar ännu";
      }

      row.append(title, meta);
      this.challengeSplitListEl.append(row);
    }
  }

  buildChallengeShareText(summary) {
    const lines = [];
    lines.push(`One Stroke Challenge · Seed ${summary.seed}`);
    lines.push(
      `Resultat: ${summary.completedCount}/${summary.totalLevels} klara · ${toDisplayScore(summary.totalScore)} poäng · ${toDisplayTime(summary.totalTimeMs)}`,
    );
    if (summary.averageSplitMs) {
      lines.push(`Snitt/split: ${toDisplayTime(summary.averageSplitMs)}`);
    }
    lines.push("");
    lines.push("Splits:");
    for (const split of summary.splits) {
      const diff = DIFFICULTY_META[split.difficulty];
      if (split.completed) {
        lines.push(
          `${split.index}. ${diff.shortLabel} ${split.levelName} | ${toDisplayTime(split.timeMs)} | U${split.undoCount}/R${split.resetCount}/H${split.hintCount} | ${toDisplayScore(split.score)}p`,
        );
      } else {
        lines.push(`${split.index}. ${diff.shortLabel} ${split.levelName} | pending`);
      }
    }
    return lines.join("\n");
  }

  async copyChallengeSummary() {
    const summary = this.getChallengeSummary();
    const text = this.buildChallengeShareText(summary);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.append(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      this.setStatus("Challenge-summary kopierad till urklipp.");
    } catch {
      this.setStatus("Kunde inte kopiera summary automatiskt.", "loss");
    }
  }

  exportChallengeSummary() {
    const summary = this.getChallengeSummary();
    const payload = {
      game: "One Stroke",
      exportedAt: new Date().toISOString(),
      mode: "challenge",
      ...summary,
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeSeed = summary.seed.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-").slice(0, 40) || "challenge";
    link.href = url;
    link.download = `one-stroke-${safeSeed}-summary.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.setStatus("Challenge-summary exporterad som JSON.");
  }

  renderModeButtons() {
    this.campaignModeBtn?.classList.toggle("active", this.hubView === "single-player");
    this.challengeModeBtn?.classList.toggle("active", this.hubView === "multiplayer");
    this.highScoreMenuBtn?.classList.toggle("active", this.hubView === "high-score");
    this.achievementMenuBtn?.classList.toggle("active", this.hubView === "achievement");
    this.creditsMenuBtn?.classList.toggle("active", this.hubView === "credit");
  }

  isGameplayHubView() {
    return this.hubView === "single-player" || this.hubView === "multiplayer";
  }

  setHubView(view, options = {}) {
    const { syncMode = true } = options;
    const allowedViews = new Set(["single-player", "multiplayer", "high-score", "achievement", "credit"]);
    if (!allowedViews.has(view)) {
      return;
    }

    this.hubView = view;
    this.renderModeButtons();
    this.renderHubPanels();

    if (!syncMode) {
      return;
    }
    if (view === "single-player") {
      this.setMode("campaign");
    } else if (view === "multiplayer") {
      this.setMode("challenge");
    }
  }

  renderHubPanels() {
    const isGameplay = this.isGameplayHubView();
    if (!isGameplay) {
      this.stopDrag();
      this.hideModal();
      this.closeLevelSelect();
    }

    if (this.playSidebarEl) {
      this.playSidebarEl.hidden = !isGameplay;
    }
    if (this.singlePlayerLevelSectionEl) {
      this.singlePlayerLevelSectionEl.hidden = this.hubView !== "single-player";
    }
    if (this.multiplayerPanelsEl) {
      this.multiplayerPanelsEl.hidden = this.hubView !== "multiplayer";
    }
    if (this.gameplayViewEl) {
      this.gameplayViewEl.hidden = !isGameplay;
    }
    if (this.hubInfoViewEl) {
      this.hubInfoViewEl.hidden = isGameplay;
    }
    if (this.highScoreViewEl) {
      this.highScoreViewEl.hidden = this.hubView !== "high-score";
    }
    if (this.achievementViewEl) {
      this.achievementViewEl.hidden = this.hubView !== "achievement";
    }
    if (this.creditsViewEl) {
      this.creditsViewEl.hidden = this.hubView !== "credit";
    }

    this.renderBoardModeLabel();
    if (this.hubView === "high-score") {
      this.renderHighScoreView();
    } else if (this.hubView === "achievement") {
      this.renderAchievementView();
    }
  }

  renderBoardModeLabel() {
    if (!this.boardModeLabelEl) {
      return;
    }
    if (this.state.mode === "challenge") {
      this.boardModeLabelEl.textContent = "Multiplayer · Challenge";
      return;
    }
    this.boardModeLabelEl.textContent = "Single-player · Kampanj";
  }

  renderHighScoreView() {
    if (
      !this.highScoreBestChallengeScoreEl ||
      !this.highScoreBestChallengeTimeEl ||
      !this.highScoreCampaignSolvedEl ||
      !this.highScoreRunCountEl ||
      !this.highScoreRunListEl
    ) {
      return;
    }

    const runs = Array.isArray(this.challengeRunHistory) ? this.challengeRunHistory : [];
    const solvedCount = Object.keys(this.progress.solvedLevels).length;
    const bestChallengeScore = runs.length > 0 ? Math.max(...runs.map((run) => Number(run.totalScore) || 0)) : 0;
    const completeRuns = runs.filter((run) => Number(run.completedCount) >= Number(run.totalLevels) && run.totalLevels > 0);
    const bestChallengeTimeMs = completeRuns.length > 0
      ? Math.min(...completeRuns.map((run) => Number(run.totalTimeMs) || Number.POSITIVE_INFINITY))
      : null;

    this.highScoreBestChallengeScoreEl.textContent = toDisplayScore(bestChallengeScore);
    this.highScoreBestChallengeTimeEl.textContent = bestChallengeTimeMs ? toDisplayTime(bestChallengeTimeMs) : "--";
    this.highScoreCampaignSolvedEl.textContent = `${solvedCount} / ${CAMPAIGN_TOTAL_LEVELS}`;
    this.highScoreRunCountEl.textContent = String(runs.length);

    const sorted = [...runs].sort((a, b) => {
      const scoreDiff = (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      const timeDiff = (Number(a.totalTimeMs) || Number.MAX_SAFE_INTEGER) - (Number(b.totalTimeMs) || Number.MAX_SAFE_INTEGER);
      if (timeDiff !== 0) {
        return timeDiff;
      }
      return String(b.finishedAt ?? "").localeCompare(String(a.finishedAt ?? ""));
    });

    this.highScoreRunListEl.innerHTML = "";
    if (sorted.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hub-empty";
      empty.textContent = "Ingen challenge-historik ännu. Spela en challenge-run för att fylla listan.";
      this.highScoreRunListEl.append(empty);
      return;
    }

    sorted.slice(0, CHALLENGE_HISTORY_LIMIT).forEach((run, index) => {
      const row = document.createElement("article");
      row.className = "hub-run-row";

      const title = document.createElement("div");
      title.className = "hub-run-title";
      title.textContent = `${index + 1}. Seed ${run.seed || "--"} · ${toDisplayScore(run.totalScore)} p`;

      const meta = document.createElement("div");
      meta.className = "hub-run-meta";
      meta.textContent =
        `${toDisplayTime(run.totalTimeMs)} · ${run.completedCount}/${run.totalLevels} klara · ${toDisplayDateTime(run.finishedAt)}`;

      row.append(title, meta);
      this.highScoreRunListEl.append(row);
    });
  }

  getAchievementMetrics() {
    const solvedEntries = Object.values(this.progress.solvedLevels ?? {});
    const campaignSolvedCount = solvedEntries.length;
    const campaignPlayedCount = solvedEntries.reduce((sum, entry) => sum + (Number(entry.playedCount) || 0), 0);

    const runs = Array.isArray(this.challengeRunHistory) ? this.challengeRunHistory : [];
    const completedRuns = runs.filter((run) => Number(run.totalLevels) > 0 && Number(run.completedCount) >= Number(run.totalLevels));
    const challengeRunCount = runs.length;
    const completedChallengeCount = completedRuns.length;
    const bestChallengeScore = runs.reduce((max, run) => Math.max(max, Number(run.totalScore) || 0), 0);
    const bestChallengeTimeMsRaw = completedRuns.reduce(
      (min, run) => Math.min(min, Number(run.totalTimeMs) || Number.POSITIVE_INFINITY),
      Number.POSITIVE_INFINITY,
    );

    const noHintCompletedCount = completedRuns.filter((run) => (Number(run.hintCount) || 0) === 0).length;
    const noResetCompletedCount = completedRuns.filter((run) => (Number(run.resetCount) || 0) === 0).length;
    const lowUndoCompletedCount = completedRuns.filter((run) => (Number(run.undoCount) || 0) <= 20).length;
    const noHintNoResetCompletedCount = completedRuns.filter(
      (run) => (Number(run.hintCount) || 0) === 0 && (Number(run.resetCount) || 0) === 0,
    ).length;
    const perfectCompletedCount = completedRuns.filter(
      (run) =>
        (Number(run.hintCount) || 0) === 0 &&
        (Number(run.resetCount) || 0) === 0 &&
        (Number(run.undoCount) || 0) === 0,
    ).length;

    return {
      campaignSolvedCount,
      campaignPlayedCount,
      challengeRunCount,
      completedChallengeCount,
      bestChallengeScore,
      bestChallengeTimeMs: Number.isFinite(bestChallengeTimeMsRaw) ? bestChallengeTimeMsRaw : null,
      noHintCompletedCount,
      noResetCompletedCount,
      lowUndoCompletedCount,
      noHintNoResetCompletedCount,
      perfectCompletedCount,
    };
  }

  buildAchievementResults(metrics) {
    const dynamicResults = TROPHY_CATALOG.map((trophy) => ({
      ...trophy,
      unlocked: trophy.tier === "platinum" ? false : Boolean(trophy.check?.(metrics)),
    }));

    let hasNewUnlock = false;
    const results = dynamicResults.map((result) => {
      if (result.tier === "platinum") {
        return result;
      }
      const persistedUnlocked = Boolean(this.achievementUnlocks?.[result.id]);
      const unlocked = persistedUnlocked || result.unlocked;
      if (unlocked && !persistedUnlocked) {
        this.achievementUnlocks[result.id] = true;
        hasNewUnlock = true;
      }
      return {
        ...result,
        unlocked,
      };
    });

    const allNonPlatinumUnlocked = results
      .filter((result) => result.tier !== "platinum")
      .every((result) => result.unlocked);

    const platinumIndex = results.findIndex((result) => result.tier === "platinum");
    if (platinumIndex >= 0) {
      const platinumId = results[platinumIndex].id;
      const persistedPlatinum = Boolean(this.achievementUnlocks?.[platinumId]);
      const platinumUnlocked = allNonPlatinumUnlocked || persistedPlatinum;
      if (platinumUnlocked && !persistedPlatinum) {
        this.achievementUnlocks[platinumId] = true;
        hasNewUnlock = true;
      }
      results[platinumIndex] = {
        ...results[platinumIndex],
        unlocked: platinumUnlocked,
      };
    }

    if (hasNewUnlock) {
      saveAchievementUnlocks(this.achievementUnlocks);
    }
    return results;
  }

  renderAchievementView() {
    if (!this.achievementSummaryEl || !this.achievementListEl) {
      return;
    }

    const metrics = this.getAchievementMetrics();
    const results = this.buildAchievementResults(metrics);
    const tierCounts = TROPHY_TIER_ORDER.reduce((acc, tier) => {
      acc[tier] = {
        total: TROPHY_TIER_META[tier].total,
        unlocked: results.filter((result) => result.tier === tier && result.unlocked).length,
      };
      return acc;
    }, {});

    const unlockedTotal = results.filter((result) => result.unlocked).length;
    const totalTrophies = results.length;
    this.achievementSummaryEl.textContent =
      `${unlockedTotal}/${totalTrophies} troféer · ` +
      `Brons ${tierCounts.bronze.unlocked}/${tierCounts.bronze.total} · ` +
      `Silver ${tierCounts.silver.unlocked}/${tierCounts.silver.total} · ` +
      `Guld ${tierCounts.gold.unlocked}/${tierCounts.gold.total} · ` +
      `Platinum ${tierCounts.platinum.unlocked}/${tierCounts.platinum.total}`;

    this.achievementListEl.innerHTML = "";
    const ordered = [...results].sort((a, b) => {
      const tierDiff = TROPHY_TIER_ORDER.indexOf(a.tier) - TROPHY_TIER_ORDER.indexOf(b.tier);
      if (tierDiff !== 0) {
        return tierDiff;
      }
      return a.id.localeCompare(b.id);
    });

    ordered.forEach((result) => {
      const card = document.createElement("article");
      card.className = `achievement-item tier-${result.tier}`;
      card.classList.toggle("unlocked", result.unlocked);

      const tier = document.createElement("span");
      tier.className = "achievement-tier";
      tier.textContent = TROPHY_TIER_META[result.tier].label;

      const name = document.createElement("div");
      name.className = "achievement-name";
      name.textContent = result.name;

      const meta = document.createElement("div");
      meta.className = "achievement-meta";
      meta.textContent = `${result.description} · ${result.unlocked ? "Klar" : "Låst"}`;

      card.append(tier, name, meta);
      this.achievementListEl.append(card);
    });
  }

  isLevelSelectOpen() {
    return Boolean(this.levelSelectModalEl && !this.levelSelectModalEl.classList.contains("hidden"));
  }

  openLevelSelect() {
    if (!this.levelSelectModalEl) {
      return;
    }
    if (this.hubView !== "single-player") {
      return;
    }
    this.levelSelectFilters.query = this.levelSelectSearchInput?.value.trim() ?? "";
    this.levelSelectFilters.difficulty = this.levelSelectDifficultyFilter?.value ?? "all";
    this.levelSelectFilters.status = this.levelSelectStatusFilter?.value ?? "all";
    this.renderFullLevelSelect();
    this.levelSelectModalEl.classList.remove("hidden");
    window.requestAnimationFrame(() => {
      this.levelSelectSearchInput?.focus();
      this.levelSelectSearchInput?.select();
    });
  }

  closeLevelSelect() {
    this.levelSelectModalEl?.classList.add("hidden");
  }

  renderFullLevelSelect() {
    if (!this.levelSelectGridEl || !this.levelSelectSummaryEl) {
      return;
    }

    const query = this.levelSelectFilters.query.toLowerCase();
    const difficultyFilter = this.levelSelectFilters.difficulty;
    const statusFilter = this.levelSelectFilters.status;
    const solvedCount = Object.keys(this.progress.solvedLevels).length;
    const unlockedCount = this.progress.unlockedLevel;

    const visibleLevels = CAMPAIGN_LEVELS.filter((level, index) => {
      const levelNumber = index + 1;
      const unlocked = levelNumber <= this.progress.unlockedLevel;
      const solved = Boolean(this.progress.solvedLevels[level.id]);
      const diff = DIFFICULTY_META[level.difficulty];
      const searchable = `${levelNumber} ${level.id} ${level.name} ${diff.label}`.toLowerCase();

      if (query && !searchable.includes(query)) {
        return false;
      }
      if (difficultyFilter !== "all" && level.difficulty !== difficultyFilter) {
        return false;
      }
      if (statusFilter === "locked" && unlocked) {
        return false;
      }
      if (statusFilter === "unlocked" && !unlocked) {
        return false;
      }
      if (statusFilter === "solved" && !solved) {
        return false;
      }
      if (statusFilter === "unsolved" && (!unlocked || solved)) {
        return false;
      }
      return true;
    });

    this.levelSelectSummaryEl.textContent =
      `Visar ${visibleLevels.length}/${CAMPAIGN_TOTAL_LEVELS} · Upplåsta ${unlockedCount} · Klara ${solvedCount}`;

    this.levelSelectGridEl.innerHTML = "";
    if (visibleLevels.length === 0) {
      const empty = document.createElement("p");
      empty.className = "level-select-empty";
      empty.textContent = "Inga nivåer matchar filtret.";
      this.levelSelectGridEl.append(empty);
      return;
    }

    for (const level of visibleLevels) {
      const index = level.campaignIndex - 1;
      const unlocked = level.campaignIndex <= this.progress.unlockedLevel;
      const solved = Boolean(this.progress.solvedLevels[level.id]);
      const diff = DIFFICULTY_META[level.difficulty];

      const card = document.createElement("button");
      card.type = "button";
      card.className = "level-select-item";
      card.setAttribute("role", "listitem");
      card.classList.toggle("active", this.state.mode === "campaign" && index === this.campaignCursorIndex);
      card.classList.toggle("solved", solved);
      card.classList.toggle("locked", !unlocked);

      const number = document.createElement("span");
      number.className = "level-select-index";
      number.textContent = `#${String(level.campaignIndex).padStart(3, "0")} · ${diff.shortLabel}`;

      const name = document.createElement("span");
      name.className = "level-select-name";
      name.textContent = level.name;

      const meta = document.createElement("span");
      meta.className = "level-select-meta";
      meta.textContent = unlocked
        ? `${level.width}x${level.height} · ${level.par + 1} noder${solved ? " · Klar" : ""}`
        : "Låst nivå";

      card.append(number, name, meta);
      card.addEventListener("click", () => {
        if (!unlocked) {
          this.flashInvalid("Nivån är låst. Lös föregående nivåer först.");
          return;
        }
        this.closeLevelSelect();
        this.hideModal();
        this.stopDrag();
        this.loadCampaignLevel(index, { announce: true, bypassLock: true });
      });
      this.levelSelectGridEl.append(card);
    }
  }

  onKeyDown(event) {
    const key = event.key;
    if (key === "Escape") {
      if (this.isLevelSelectOpen()) {
        this.closeLevelSelect();
        return;
      }
      if (!this.winModalEl.classList.contains("hidden")) {
        this.hideModal();
        return;
      }
    }

    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) {
      return;
    }
    if (!this.isGameplayHubView()) {
      return;
    }

    if (key === "Backspace") {
      event.preventDefault();
      this.undo();
      return;
    }
    if (key === "z" || key === "Z") {
      this.undo();
      return;
    }
    if (key === "r" || key === "R") {
      this.resetLevel();
      return;
    }
    if (key === "h" || key === "H") {
      this.requestHint();
      return;
    }
    if (key === "n" || key === "N") {
      this.goToNextLevel();
      return;
    }
    if (key === "l" || key === "L") {
      this.openLevelSelect();
      return;
    }

    if (this.state.status !== "playing") {
      return;
    }

    const deltaByKey = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    };
    const delta = deltaByKey[key];
    if (!delta) {
      return;
    }
    event.preventDefault();
    this.tryMoveByDirection(delta[0], delta[1]);
  }

  onPointerDown(event) {
    if (this.state.status !== "playing") {
      return;
    }
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const cell = event.target.closest(".cell.playable");
    if (!cell) {
      return;
    }

    this.drag.active = true;
    this.drag.pointerId = event.pointerId;
    this.drag.lastKey = null;
    try {
      this.boardEl.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture errors.
    }
    this.handleCellInput(cell.dataset.key, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
    event.preventDefault();
  }

  onPointerMove(event) {
    if (!this.drag.active || this.drag.pointerId !== event.pointerId) {
      return;
    }
    if (this.state.status !== "playing") {
      this.stopDrag(event.pointerId);
      return;
    }

    const nodeAtPoint = document.elementFromPoint(event.clientX, event.clientY);
    const cell = nodeAtPoint ? nodeAtPoint.closest(".cell.playable") : null;
    if (!cell) {
      return;
    }
    this.handleCellInput(cell.dataset.key, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
  }

  onPointerUp(event) {
    if (!this.drag.active || this.drag.pointerId !== event.pointerId) {
      return;
    }
    this.stopDrag(event.pointerId);
  }

  stopDrag(pointerId = this.drag.pointerId) {
    if (!this.drag.active) {
      return;
    }
    try {
      if (this.boardEl.hasPointerCapture(pointerId)) {
        this.boardEl.releasePointerCapture(pointerId);
      }
    } catch {
      // Ignore capture errors.
    }
    this.drag.active = false;
    this.drag.pointerId = null;
    this.drag.lastKey = null;
  }

  loadCampaignLevel(index, options = {}) {
    const { bypassLock = false, announce = true } = options;
    const clamped = clamp(index, 0, CAMPAIGN_TOTAL_LEVELS - 1);
    const level = CAMPAIGN_LEVELS[clamped];
    const campaignLevelNumber = clamped + 1;

    if (!bypassLock && campaignLevelNumber > this.progress.unlockedLevel) {
      this.setStatus("Nivån är låst. Lös föregående nivå först.", "loss");
      this.flashInvalidBoard();
      return;
    }

    this.state.mode = "campaign";
    this.campaignCursorIndex = clamped;
    this.loadLevel(level, clamped, announce);
  }

  loadChallengeLevel(index, options = {}) {
    const { announce = true } = options;
    if (this.challenge.levels.length === 0) {
      this.setStatus("Ingen challenge tillgänglig ännu.", "loss");
      return;
    }
    const clamped = clamp(index, 0, this.challenge.levels.length - 1);
    const level = this.challenge.levels[clamped];

    this.state.mode = "challenge";
    this.challenge.cursor = clamped;
    this.loadLevel(level, clamped, announce);
  }

  loadLevel(level, sourceIndex, announce) {
    const startKey = coordKey(level.start[0], level.start[1]);
    this.state.levelSourceIndex = sourceIndex;
    this.state.level = level;
    this.state.blockedSet = getBlockedSet(level);
    this.state.playableCount = getPlayableCount(level);
    this.state.path = [startKey];
    this.state.visited = new Set(this.state.path);
    this.state.status = "playing";
    this.levelAttempt = {
      startedAtMs: Date.now(),
      undoCount: 0,
      resetCount: 0,
      hintCount: 0,
    };
    this.activeHintKey = null;

    this.buildBoard();
    this.hideModal();
    this.renderState();
    this.renderModeButtons();
    this.renderChallengePanel();
    this.renderHubPanels();

    if (announce) {
      const modePrefix =
        this.state.mode === "campaign"
          ? `Kampanjnivå ${level.campaignIndex}`
          : `Challenge ${this.challenge.cursor + 1}`;
      this.setStatus(`${modePrefix}: ${level.name}`);
    }
  }

  buildBoard() {
    this.cells.clear();
    this.boardEl.innerHTML = "";
    this.boardEl.style.setProperty("--cols", String(this.state.level.width));
    this.boardEl.style.setProperty("--rows", String(this.state.level.height));

    for (let y = 0; y < this.state.level.height; y += 1) {
      for (let x = 0; x < this.state.level.width; x += 1) {
        const key = coordKey(x, y);
        const blocked = this.state.blockedSet.has(key);
        const node = document.createElement(blocked ? "div" : "button");
        node.className = blocked ? "cell blocked" : "cell playable";
        if (!blocked) {
          node.type = "button";
          node.dataset.key = key;
          node.setAttribute("aria-label", `Nod ${x + 1},${y + 1}`);
          node.append(this.createTraceNode());
          this.cells.set(key, node);
        } else {
          node.setAttribute("aria-hidden", "true");
        }
        this.boardEl.append(node);
      }
    }
  }

  renderState() {
    const { level, status, playableCount, visited, path } = this.state;
    const stepByKey = new Map();
    path.forEach((key, idx) => {
      stepByKey.set(key, idx + 1);
    });
    const connectionByKey = this.buildConnectionMap(path);

    const tailKey = this.getTailKey();
    const startKey = path[0];
    const nextOptions = new Set(
      status === "playing"
        ? getNeighborKeys(level, this.state.blockedSet, tailKey).filter((key) => !visited.has(key))
        : [],
    );

    for (const [key, cell] of this.cells) {
      const isVisited = stepByKey.has(key);
      const step = stepByKey.get(key);
      const connections = connectionByKey.get(key);
      cell.classList.toggle("visited", isVisited);
      cell.classList.toggle("tail", key === tailKey);
      cell.classList.toggle("start", key === startKey);
      cell.classList.toggle("next-option", nextOptions.has(key));
      cell.classList.toggle("hint-target", status === "playing" && key === this.activeHintKey);
      cell.classList.toggle("conn-up", connections?.has("up") === true);
      cell.classList.toggle("conn-right", connections?.has("right") === true);
      cell.classList.toggle("conn-down", connections?.has("down") === true);
      cell.classList.toggle("conn-left", connections?.has("left") === true);
      cell.dataset.step = isVisited ? String(step) : "";
    }

    const difficulty = DIFFICULTY_META[level.difficulty];
    this.levelNameEl.textContent = level.name;
    if (this.state.mode === "campaign") {
      this.levelLabelEl.textContent = `${level.campaignIndex} / ${CAMPAIGN_TOTAL_LEVELS}`;
    } else {
      this.levelLabelEl.textContent = `${this.challenge.cursor + 1} / ${this.challenge.levels.length}`;
    }
    this.difficultyLabelEl.textContent = difficulty.label;
    this.visitedLabelEl.textContent = String(visited.size);
    this.remainingLabelEl.textContent = String(playableCount - visited.size);
    this.phaseLabelEl.textContent = this.getPhaseLabel(status);
    this.renderBoardModeLabel();

    this.renderCampaignMeta();
    this.renderLevelButtons();
    this.updateNextButton();
    if (this.isLevelSelectOpen()) {
      this.renderFullLevelSelect();
    }
  }

  renderCampaignMeta() {
    const solvedCount = Object.keys(this.progress.solvedLevels).length;
    this.campaignProgressLabelEl.textContent = `${solvedCount} klara`;
  }

  updateNextButton() {
    if (this.state.status !== "won") {
      this.nextBtn.disabled = true;
      return;
    }

    if (this.state.mode === "campaign") {
      const nextIndex = this.campaignCursorIndex + 1;
      const nextNumber = nextIndex + 1;
      this.nextBtn.disabled = nextNumber > this.progress.unlockedLevel || nextIndex >= CAMPAIGN_TOTAL_LEVELS;
      return;
    }

    const challengeHasNext = this.challenge.cursor + 1 < this.challenge.levels.length;
    this.nextBtn.disabled = !challengeHasNext;
  }

  renderLevelButtons() {
    this.levelListEl.innerHTML = "";
    this.levelButtons = [];

    if (this.state.mode === "campaign") {
      const windowSize = 18;
      const start = clamp(this.campaignCursorIndex - Math.floor(windowSize / 2), 0, CAMPAIGN_TOTAL_LEVELS - 1);
      const end = clamp(start + windowSize - 1, 0, CAMPAIGN_TOTAL_LEVELS - 1);

      for (let index = start; index <= end; index += 1) {
        const level = CAMPAIGN_LEVELS[index];
        const unlocked = index + 1 <= this.progress.unlockedLevel;
        const solved = Boolean(this.progress.solvedLevels[level.id]);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "level-btn";
        button.textContent = unlocked ? String(index + 1) : "Låst";
        button.disabled = !unlocked;
        button.title = `${level.name} (${DIFFICULTY_META[level.difficulty].label})`;
        button.classList.toggle("active", index === this.campaignCursorIndex);
        button.classList.toggle("solved", solved);
        button.classList.toggle("locked", !unlocked);
        button.addEventListener("click", () => this.loadCampaignLevel(index));
        this.levelButtons.push(button);
        this.levelListEl.append(button);
      }
      return;
    }

    this.challenge.levels.forEach((level, index) => {
      const solved = Boolean(this.challenge.resultsByLevelId[level.id]);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "level-btn";
      button.textContent = `${index + 1}`;
      button.title = `${level.name} (${DIFFICULTY_META[level.difficulty].label})`;
      button.classList.toggle("active", index === this.challenge.cursor);
      button.classList.toggle("solved", solved);
      button.addEventListener("click", () => this.loadChallengeLevel(index));
      this.levelButtons.push(button);
      this.levelListEl.append(button);
    });
  }

  getPhaseLabel(status) {
    if (status === "won") {
      return "Vinst";
    }
    if (status === "lost") {
      return "Fastlåst";
    }
    return "Spelar";
  }

  handleCellInput(key, pointerPosition = null) {
    if (this.drag.lastKey === key) {
      return;
    }
    this.drag.lastKey = key;
    this.tryExtendPath(key, pointerPosition);
  }

  requestHint() {
    if (this.state.status !== "playing") {
      this.setStatus("Hints kan bara användas medan banan pågår.");
      return;
    }

    const hint = this.findHintTarget();
    if (!hint) {
      this.flashInvalid("Ingen säker hint hittades här. Testa Ångra eller Starta om.");
      return;
    }

    const isNewHint = this.activeHintKey !== hint.key;
    this.activeHintKey = hint.key;
    if (isNewHint) {
      this.levelAttempt.hintCount += 1;
    }

    this.renderState();
    const [x, y] = parseKey(hint.key);
    const penaltyText =
      this.state.mode === "challenge" ? ` (-${toDisplayScore(CHALLENGE_HINT_PENALTY)} p)` : " (sparas i statistik)";
    this.setStatus(`Hint: prova nod ${x + 1},${y + 1}.${penaltyText}`);
  }

  findHintTarget() {
    const fromSolution = this.getSolutionHintTarget();
    if (fromSolution) {
      return {
        key: fromSolution,
        source: "solution",
      };
    }
    const fromHeuristic = this.getHeuristicHintTarget();
    if (fromHeuristic) {
      return {
        key: fromHeuristic,
        source: "heuristic",
      };
    }
    return null;
  }

  getSolutionHintTarget() {
    const solutionPath = this.getSolutionPathKeys(this.state.level);
    if (!solutionPath || this.state.path.length >= solutionPath.length) {
      return null;
    }
    for (let index = 0; index < this.state.path.length; index += 1) {
      if (this.state.path[index] !== solutionPath[index]) {
        return null;
      }
    }
    return solutionPath[this.state.path.length];
  }

  getSolutionPathKeys(level) {
    const cached = this.solutionPathCache.get(level.id);
    if (cached) {
      return cached;
    }

    if (typeof level.solution !== "string" || level.solution.length === 0) {
      return null;
    }

    const deltaByDirection = {
      U: [0, -1],
      D: [0, 1],
      L: [-1, 0],
      R: [1, 0],
    };
    let currentX = level.start[0];
    let currentY = level.start[1];
    const blockedSet = getBlockedSet(level);
    const keys = [coordKey(currentX, currentY)];
    for (const direction of level.solution) {
      const delta = deltaByDirection[direction];
      if (!delta) {
        return null;
      }
      currentX += delta[0];
      currentY += delta[1];
      if (!inBounds(level, currentX, currentY)) {
        return null;
      }
      const key = coordKey(currentX, currentY);
      if (blockedSet.has(key)) {
        return null;
      }
      keys.push(key);
    }
    this.solutionPathCache.set(level.id, keys);
    return keys;
  }

  getHeuristicHintTarget() {
    const tailKey = this.getTailKey();
    const candidates = getNeighborKeys(this.state.level, this.state.blockedSet, tailKey).filter(
      (key) => !this.state.visited.has(key),
    );
    if (candidates.length === 0) {
      return null;
    }

    const viable = [];
    for (const key of candidates) {
      const simulatedVisited = new Set(this.state.visited);
      simulatedVisited.add(key);
      const deadReason = this.getDeadStateReasonFor(key, simulatedVisited);
      if (!deadReason) {
        const onwardOptions = getNeighborKeys(this.state.level, this.state.blockedSet, key).filter(
          (neighbor) => !simulatedVisited.has(neighbor),
        ).length;
        viable.push({ key, onwardOptions });
      }
    }

    if (viable.length === 0) {
      return null;
    }

    viable.sort((a, b) => a.onwardOptions - b.onwardOptions);
    return viable[0].key;
  }

  tryMoveByDirection(dx, dy) {
    const [x, y] = parseKey(this.getTailKey());
    const nextX = x + dx;
    const nextY = y + dy;
    if (!inBounds(this.state.level, nextX, nextY)) {
      this.flashInvalid("Draget går utanför spelplanen.");
      return;
    }
    const nextKey = coordKey(nextX, nextY);
    if (!this.cells.has(nextKey)) {
      this.flashInvalid("Den noden är blockerad.");
      return;
    }
    this.tryExtendPath(nextKey, null);
  }

  tryExtendPath(targetKey, pointerPosition = null) {
    if (this.state.status !== "playing") {
      return;
    }

    const tailKey = this.getTailKey();
    if (targetKey === tailKey) {
      return;
    }

    if (!this.cells.has(targetKey)) {
      this.flashInvalid("Den noden går inte att använda.");
      return;
    }

    if (!this.isAdjacentKeys(tailKey, targetKey)) {
      this.flashInvalid("Endast ortogonala steg från senaste noden är giltiga.");
      return;
    }

    const previousKey = this.state.path[this.state.path.length - 2];
    if (targetKey === previousKey) {
      this.backtrackOneStep("drag", targetKey, pointerPosition);
      return;
    }

    if (this.state.visited.has(targetKey)) {
      this.flashInvalid("Noden är redan använd. Dra bakåt till föregående nod eller använd Ångra.");
      return;
    }

    this.state.path.push(targetKey);
    this.state.visited.add(targetKey);
    this.activeHintKey = null;

    if (this.state.visited.size === this.state.playableCount) {
      this.handleWin();
      return;
    }

    const deadReason = this.getDeadStateReason();
    if (deadReason) {
      this.handleLoss(deadReason);
      return;
    }

    this.renderState();
    this.setStatus(`Bra. ${this.state.playableCount - this.state.visited.size} noder kvar.`);
  }

  backtrackOneStep(source = "undo", focusKey = null, pointerPosition = null) {
    if (this.state.path.length <= 1) {
      return false;
    }

    this.levelAttempt.undoCount += 1;
    const removedKey = this.state.path.pop();
    this.state.visited.delete(removedKey);
    this.state.status = "playing";
    this.activeHintKey = null;
    this.hideModal();
    this.renderState();
    if (this.state.mode === "challenge") {
      this.renderChallengeResults();
      if (source === "drag") {
        this.showBoardPenaltyFeedback(CHALLENGE_UNDO_PENALTY_SECONDS, focusKey, pointerPosition);
      }
    }
    const remaining = this.state.playableCount - this.state.visited.size;
    const challengePenaltyText =
      this.state.mode === "challenge" ? ` (-${CHALLENGE_UNDO_PENALTY_SECONDS}s i challenge-straff)` : "";
    const prefix = source === "drag" ? "Drog tillbaka ett steg." : "Ångrade ett steg.";
    this.setStatus(`${prefix}${challengePenaltyText} ${remaining} noder kvar.`);
    return true;
  }

  showBoardPenaltyFeedback(penaltySeconds, key, pointerPosition = null) {
    if (this.state.mode !== "challenge" || !this.boardStageEl || penaltySeconds <= 0) {
      return;
    }

    const marker = document.createElement("div");
    marker.className = "board-penalty-float";
    marker.textContent = toDisplayPenaltySeconds(penaltySeconds);

    const fallbackLeft = this.boardEl.offsetLeft + this.boardEl.clientWidth * 0.5;
    const fallbackTop = this.boardEl.offsetTop + this.boardEl.clientHeight * 0.2;
    let left = fallbackLeft;
    let top = fallbackTop;

    if (Number.isFinite(pointerPosition?.clientX) && Number.isFinite(pointerPosition?.clientY)) {
      const boardStageRect = this.boardStageEl.getBoundingClientRect();
      left = clamp(pointerPosition.clientX - boardStageRect.left, 18, boardStageRect.width - 18);
      top = clamp(pointerPosition.clientY - boardStageRect.top - 12, 18, boardStageRect.height - 18);
    } else if (key && this.cells.has(key)) {
      const cell = this.cells.get(key);
      left = this.boardEl.offsetLeft + cell.offsetLeft + cell.clientWidth * 0.5;
      top = this.boardEl.offsetTop + cell.offsetTop + cell.clientHeight * 0.35;
    }

    marker.style.left = `${left}px`;
    marker.style.top = `${top}px`;

    this.boardStageEl.append(marker);
    window.setTimeout(() => {
      marker.remove();
    }, 700);
  }

  undo() {
    this.backtrackOneStep("undo");
  }

  resetLevel() {
    this.levelAttempt.resetCount += 1;
    const startKey = coordKey(this.state.level.start[0], this.state.level.start[1]);
    this.state.path = [startKey];
    this.state.visited = new Set(this.state.path);
    this.state.status = "playing";
    this.activeHintKey = null;
    this.stopDrag();
    this.hideModal();
    this.renderState();
    if (this.state.mode === "challenge") {
      this.renderChallengeResults();
    }
    this.setStatus("Banan återställd. Kör igen.");
  }

  handleWin() {
    this.state.status = "won";
    this.activeHintKey = null;
    this.stopDrag();

    const durationMs = Date.now() - this.levelAttempt.startedAtMs;
    const result = {
      durationMs,
      undoCount: this.levelAttempt.undoCount,
      resetCount: this.levelAttempt.resetCount,
      hintCount: this.levelAttempt.hintCount,
      completedAt: Date.now(),
    };

    if (this.state.mode === "campaign") {
      this.recordCampaignResult(this.state.level, result);
    } else {
      this.recordChallengeResult(this.state.level, result);
    }

    this.renderState();
    this.renderChallengePanel();

    const hasNext = this.hasNextLevelInCurrentMode();
    this.setStatus("Bana klar. Alla noder täckta exakt en gång.", "win");

    const timingText = `${toDisplayTime(durationMs)} · ${result.undoCount} undo · ${result.resetCount} reset · ${result.hintCount} hint`;
    if (this.state.mode === "campaign") {
      this.showModal(
        hasNext
          ? `Kampanj klarad. ${timingText}. Nästa nivå är upplåst.`
          : `Sista kampanjnivån klarad. ${timingText}.`,
        hasNext,
      );
    } else {
      const solvedCount = Object.keys(this.challenge.resultsByLevelId).length;
      const summary = this.getChallengeSummary();
      const currentSplit = summary.splits.find((split) => split.levelId === this.state.level.id);
      const splitScore = currentSplit?.score ?? 0;
      this.showModal(
        hasNext
          ? `Challenge bana ${this.challenge.cursor + 1}/10 klarad. ${timingText}. Split ${toDisplayScore(splitScore)} p · Totalt ${toDisplayScore(summary.totalScore)} p.`
          : `Challenge slutförd (${solvedCount}/10). ${timingText}. Totalt ${toDisplayScore(summary.totalScore)} p.`,
        hasNext,
      );
    }
  }

  hasNextLevelInCurrentMode() {
    if (this.state.mode === "campaign") {
      const nextIndex = this.campaignCursorIndex + 1;
      return nextIndex < CAMPAIGN_TOTAL_LEVELS && nextIndex + 1 <= this.progress.unlockedLevel;
    }
    return this.challenge.cursor + 1 < this.challenge.levels.length;
  }

  recordCampaignResult(level, result) {
    const previous = this.progress.solvedLevels[level.id];
    if (!previous || result.durationMs < previous.bestTimeMs) {
      this.progress.solvedLevels[level.id] = {
        bestTimeMs: result.durationMs,
        bestUndoCount: result.undoCount,
        bestResetCount: result.resetCount,
        bestHintCount: result.hintCount ?? 0,
        playedCount: (previous?.playedCount ?? 0) + 1,
      };
    } else {
      this.progress.solvedLevels[level.id] = {
        ...previous,
        playedCount: (previous.playedCount ?? 1) + 1,
      };
    }

    const unlockCandidate = level.campaignIndex + 1;
    if (unlockCandidate > this.progress.unlockedLevel) {
      this.progress.unlockedLevel = clamp(unlockCandidate, 1, CAMPAIGN_TOTAL_LEVELS);
    }
    saveCampaignProgress(this.progress);
    this.renderHubPanels();
  }

  recordChallengeResult(level, result) {
    this.challenge.resultsByLevelId[level.id] = {
      ...result,
    };
    if (this.isCurrentChallengeCompleted() && !this.challengeRunMeta.saved) {
      this.archiveCompletedChallengeRun();
    } else {
      this.renderHubPanels();
    }
  }

  isCurrentChallengeCompleted() {
    if (!Array.isArray(this.challenge.levels) || this.challenge.levels.length === 0) {
      return false;
    }
    return Object.keys(this.challenge.resultsByLevelId).length >= this.challenge.levels.length;
  }

  archiveCompletedChallengeRun() {
    const summary = this.getChallengeSummary();
    if (summary.completedCount === 0) {
      return;
    }

    const totals = summary.splits.reduce(
      (acc, split) => {
        if (!split.completed) {
          return acc;
        }
        acc.undoCount += split.undoCount;
        acc.resetCount += split.resetCount;
        acc.hintCount += split.hintCount;
        return acc;
      },
      { undoCount: 0, resetCount: 0, hintCount: 0 },
    );

    const entry = {
      id: `run-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
      seed: summary.seed,
      startedAt: new Date(this.challengeRunMeta.startedAtMs).toISOString(),
      finishedAt: new Date().toISOString(),
      completedCount: summary.completedCount,
      totalLevels: summary.totalLevels,
      totalScore: summary.totalScore,
      totalTimeMs: summary.totalTimeMs,
      averageSplitMs: summary.averageSplitMs,
      undoCount: totals.undoCount,
      resetCount: totals.resetCount,
      hintCount: totals.hintCount,
      splits: summary.splits,
    };

    this.challengeRunHistory = [entry, ...this.challengeRunHistory].slice(0, CHALLENGE_HISTORY_LIMIT);
    saveChallengeRunHistory(this.challengeRunHistory, CHALLENGE_HISTORY_LIMIT);
    this.challengeRunMeta.saved = true;
    this.renderHubPanels();
  }

  handleLoss(reason) {
    this.state.status = "lost";
    this.stopDrag();
    this.renderState();
    this.setStatus(`Fastlåst läge: ${reason} Använd Ångra eller Starta om.`, "loss");
  }

  getDeadStateReason() {
    return this.getDeadStateReasonFor(this.getTailKey(), this.state.visited);
  }

  getDeadStateReasonFor(tailKey, visitedSet) {
    const unvisited = this.getUnvisitedKeys(visitedSet);
    if (unvisited.length === 0) {
      return null;
    }

    const immediateMoves = getNeighborKeys(this.state.level, this.state.blockedSet, tailKey).filter(
      (key) => !visitedSet.has(key),
    );
    if (immediateMoves.length === 0) {
      return "inga giltiga drag kvar från nuvarande nod.";
    }

    const allowed = new Set(unvisited);
    allowed.add(tailKey);

    const queue = [tailKey];
    const seen = new Set([tailKey]);
    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = getNeighborKeys(this.state.level, this.state.blockedSet, current);
      for (const neighbor of neighbors) {
        if (!allowed.has(neighbor) || seen.has(neighbor)) {
          continue;
        }
        seen.add(neighbor);
        queue.push(neighbor);
      }
    }

    for (const key of unvisited) {
      if (!seen.has(key)) {
        return "minst en nod blev isolerad.";
      }
    }

    return null;
  }

  getUnvisitedKeys(visitedSet = this.state.visited) {
    const keys = getAllPlayableKeys(this.state.level);
    return keys.filter((key) => !visitedSet.has(key));
  }

  getTailKey() {
    return this.state.path[this.state.path.length - 1];
  }

  createTraceNode() {
    const trace = document.createElement("div");
    trace.className = "trace";
    const directions = ["up", "right", "down", "left"];
    for (const direction of directions) {
      const arm = document.createElement("span");
      arm.className = `trace-arm arm-${direction}`;
      trace.append(arm);
    }
    const core = document.createElement("span");
    core.className = "trace-core";
    trace.append(core);
    return trace;
  }

  buildConnectionMap(path) {
    const connectionByKey = new Map();
    for (const key of path) {
      connectionByKey.set(key, new Set());
    }

    for (let index = 0; index < path.length - 1; index += 1) {
      const current = path[index];
      const next = path[index + 1];
      const direction = directionBetweenKeys(current, next);
      if (!direction) {
        continue;
      }
      connectionByKey.get(current).add(this.toConnectionDirection(direction));
      connectionByKey.get(next).add(this.toConnectionDirection(this.reverseDirection(direction)));
    }
    return connectionByKey;
  }

  toConnectionDirection(direction) {
    if (direction === "U") {
      return "up";
    }
    if (direction === "D") {
      return "down";
    }
    if (direction === "L") {
      return "left";
    }
    return "right";
  }

  reverseDirection(direction) {
    if (direction === "U") {
      return "D";
    }
    if (direction === "D") {
      return "U";
    }
    if (direction === "L") {
      return "R";
    }
    return "L";
  }

  isAdjacentKeys(aKey, bKey) {
    const [ax, ay] = parseKey(aKey);
    const [bx, by] = parseKey(bKey);
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  }

  flashInvalid(message) {
    this.setStatus(message, "loss");
    this.flashInvalidBoard();
  }

  flashInvalidBoard() {
    if (this.invalidTimer) {
      window.clearTimeout(this.invalidTimer);
    }
    this.boardEl.classList.remove("invalid");
    void this.boardEl.offsetWidth;
    this.boardEl.classList.add("invalid");
    this.invalidTimer = window.setTimeout(() => {
      this.boardEl.classList.remove("invalid");
    }, 260);
  }

  setStatus(message, tone = "neutral") {
    this.statusBoxEl.textContent = message;
    this.statusBoxEl.classList.remove("status-win", "status-loss");
    if (tone === "win") {
      this.statusBoxEl.classList.add("status-win");
    } else if (tone === "loss") {
      this.statusBoxEl.classList.add("status-loss");
    }
  }

  showModal(text, showNext) {
    this.winTextEl.textContent = text;
    this.modalNextBtn.hidden = !showNext;
    this.winModalEl.classList.remove("hidden");
  }

  hideModal() {
    this.winModalEl.classList.add("hidden");
  }

  goToNextLevel() {
    if (this.state.status !== "won") {
      this.setStatus("Klara banan först för att gå vidare.");
      return;
    }

    if (this.state.mode === "campaign") {
      const nextIndex = this.campaignCursorIndex + 1;
      const nextNumber = nextIndex + 1;
      if (nextIndex >= CAMPAIGN_TOTAL_LEVELS) {
        this.setStatus("Du är redan på sista kampanjnivån.", "win");
        return;
      }
      if (nextNumber > this.progress.unlockedLevel) {
        this.setStatus("Nästa nivå är inte upplåst ännu.", "loss");
        return;
      }
      this.loadCampaignLevel(nextIndex, { announce: true, bypassLock: true });
      return;
    }

    const nextChallengeIndex = this.challenge.cursor + 1;
    if (nextChallengeIndex >= this.challenge.levels.length) {
      this.setStatus("Challenge slutförd. Generera en ny seed för nästa omgång.", "win");
      return;
    }
    this.loadChallengeLevel(nextChallengeIndex, { announce: true });
  }
}
