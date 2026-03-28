import {
  CAMPAIGN_LEVELS as GENERATED_LEVELS,
  CAMPAIGN_TOTAL_LEVELS as GENERATED_TOTAL,
} from "../data/campaign-levels.js";
import { DIFFICULTY_META, DIFFICULTY_ORDER } from "../data/difficulty.js";
import { TUTORIAL_LEVELS } from "../data/tutorial-levels.js";

// Replace first N generated levels with hand-crafted tutorials.
const CAMPAIGN_LEVELS = [
  ...TUTORIAL_LEVELS,
  ...GENERATED_LEVELS.slice(TUTORIAL_LEVELS.length),
];
const CAMPAIGN_TOTAL_LEVELS = CAMPAIGN_LEVELS.length;

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
import {
  createMatch,
  addPlayerToMatch,
  logMatchEvent,
  getMatchStandings,
  getLevelComparison,
  serializeMatch,
  validateMatchStructure,
  encodeMatchCode,
  decodeMatchCode,
} from "../core/match.js";
import { checkRunResult } from "../core/plausibility.js";
import { createMixedChallenge } from "./challenge-pool.js";
import {
  clamp,
  todaySeed,
  createRunId,
  toDisplayTime,
  toDisplayScore,
  toDisplayDecimal,
  toDisplayPercent,
  toMachineDecimal,
  toDisplaySignedScoreDelta,
  toDisplaySignedTimeDelta,
  toDisplayPenaltySeconds,
  toDisplayDateTime,
} from "./formatting.js";
import {
  loadAchievementUnlocks,
  loadCampaignProgress,
  loadChallengeRunHistory,
  saveAchievementUnlocks,
  saveCampaignProgress,
  saveChallengeRunHistory,
} from "./storage.js";
import {
  TROPHY_TIER_ORDER,
  TROPHY_TIER_META,
  createTrophyCatalog,
} from "./trophies.js";

const LEVEL_FORMAT_VERSION = 2;
const LOCAL_PLAYER_ID = "local-player";
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
const CHALLENGE_SUMMARY_SCHEMA_VERSION = 1;
const CHALLENGE_SUMMARY_SCHEMA_KIND = "one-stroke.challenge-summary";

const TROPHY_CATALOG = createTrophyCatalog(CAMPAIGN_TOTAL_LEVELS);

export class OneStrokeApp {
  constructor() {
    this.validateCampaignData();

    this.appShellEl = document.querySelector(".app-shell");
    this.boardEl = document.getElementById("board");
    this.boardStageEl = this.boardEl?.closest(".board-stage") ?? null;
    this.liveTimerEl = document.getElementById("liveTimer");
    this.liveMovesEl = document.getElementById("liveMoves");
    this.countdownOverlayEl = document.getElementById("countdownOverlay");
    this.countdownNumberEl = document.getElementById("countdownNumber");
    this.readyBtn = document.getElementById("readyBtn");
    this.opponentDeltaEl = document.getElementById("opponentDelta");
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
    this.modalCloseBtn = document.getElementById("modalCloseBtn");
    this.modalExportMatchBtn = document.getElementById("modalExportMatchBtn");
    this.modalExportConfirmEl = document.getElementById("modalExportConfirm");
    this.winSplitTableEl = document.getElementById("winSplitTable");
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
    this.highScoreDifficultyBodyEl = document.getElementById("highScoreDifficultyBody");
    this.highScoreRunCompletionRateEl = document.getElementById("highScoreRunCompletionRate");
    this.highScoreRunAverageScoreEl = document.getElementById("highScoreRunAverageScore");
    this.highScoreRunAverageTimeEl = document.getElementById("highScoreRunAverageTime");
    this.highScoreRunAverageCompletedEl = document.getElementById("highScoreRunAverageCompleted");
    this.highScoreRunAverageUndoEl = document.getElementById("highScoreRunAverageUndo");
    this.highScoreRunAverageHintEl = document.getElementById("highScoreRunAverageHint");
    this.highScoreRunListEl = document.getElementById("highScoreRunList");
    this.highScoreRunDetailEl = document.getElementById("highScoreRunDetail");
    this.achievementSummaryEl = document.getElementById("achievementSummary");
    this.achievementListEl = document.getElementById("achievementList");
    this.challengeSeedInput = document.getElementById("challengeSeedInput");
    this.challengeGenerateBtn = document.getElementById("challengeGenerateBtn");
    this.challengeListEl = document.getElementById("challengeList");
    this.challengeScoreLabelEl = document.getElementById("challengeScoreLabel");
    this.challengeTimeLabelEl = document.getElementById("challengeTimeLabel");
    this.challengeCompletedLabelEl = document.getElementById("challengeCompletedLabel");
    this.challengeSplitListEl = document.getElementById("challengeSplitList");
    this.levelSelectModalEl = document.getElementById("levelSelectModal");
    this.levelSelectCloseBtn = document.getElementById("levelSelectCloseBtn");
    this.levelSelectSummaryEl = document.getElementById("levelSelectSummary");
    this.levelSelectSearchInput = document.getElementById("levelSelectSearchInput");
    this.levelSelectDifficultyFilter = document.getElementById("levelSelectDifficultyFilter");
    this.levelSelectStatusFilter = document.getElementById("levelSelectStatusFilter");
    this.levelSelectGridEl = document.getElementById("levelSelectGrid");
    this.matchLevelCountSelect = document.getElementById("matchLevelCountSelect");
    this.exportMatchBtn = document.getElementById("exportMatchBtn");
    this.importMatchBtn = document.getElementById("importMatchBtn");
    this.matchStandingsViewEl = document.getElementById("matchStandingsView");
    this.matchStandingsListEl = document.getElementById("matchStandingsList");
    this.matchLevelComparisonEl = document.getElementById("matchLevelComparison");
    this.matchImportModalEl = document.getElementById("matchImportModal");
    this.matchImportTextarea = document.getElementById("matchImportTextarea");
    this.matchImportCancelBtn = document.getElementById("matchImportCancelBtn");
    this.matchImportConfirmBtn = document.getElementById("matchImportConfirmBtn");

    // Mobile UI
    this.mobileTabBar = document.getElementById("mobileTabBar");
    this.mobileTabPlay = document.getElementById("mobileTabPlay");
    this.mobileTabMenu = document.getElementById("mobileTabMenu");
    this.mobileTabStats = document.getElementById("mobileTabStats");
    this.mobilePanelBackdrop = document.getElementById("mobilePanelBackdrop");
    this.sidebarEl = document.getElementById("sidebar");
    this.mobilePanelOpen = false;

    // Phase-based multiplayer panels
    this.matchPhaseSetupEl = document.getElementById("matchPhaseSetup");
    this.matchPhasePlayEl = document.getElementById("matchPhasePlay");
    this.matchPhaseShareEl = document.getElementById("matchPhaseShare");
    this.matchPhaseResultsEl = document.getElementById("matchPhaseResults");
    this.matchProgressLabelEl = document.getElementById("matchProgressLabel");
    this.matchAbortBtn = document.getElementById("matchAbortBtn");
    this.matchNewAfterShareBtn = document.getElementById("matchNewAfterShare");
    this.matchNewAfterResultsBtn = document.getElementById("matchNewAfterResults");
    this.matchShareConfirmEl = document.getElementById("matchShareConfirm");
    this.matchResultStatusEl = document.getElementById("matchResultStatus");
    this.shareTotalScoreEl = document.getElementById("shareTotalScore");
    this.shareTotalTimeEl = document.getElementById("shareTotalTime");
    this.shareTotalCompletedEl = document.getElementById("shareTotalCompleted");

    this.cells = new Map();
    this.levelButtons = [];
    this.invalidTimer = null;
    this.liveTimerInterval = null;
    this.countdownTimer = null;
    this.drag = {
      active: false,
      pointerId: null,
      lastKey: null,
    };
    this.activeHintKey = null;
    this.solutionPathCache = new Map();
    this.hubView = "single-player";
    this.matchPhase = "setup"; // setup | play | share | results
    this.selectedHighScoreRunId = null;

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
      runId: createRunId(),
      startedAtMs: Date.now(),
      saved: false,
    };
    this.activeMatch = null;

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
    this.matchPhase = "setup"; // Reset after createChallenge set it to "play"
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
    this.readyBtn?.addEventListener("click", () => this.onReadyClick());
    this.undoBtn.addEventListener("click", () => this.undo());
    this.resetBtn.addEventListener("click", () => this.resetLevel());
    this.hintBtn.addEventListener("click", () => this.requestHint());
    this.nextBtn.addEventListener("click", () => this.goToNextLevel());
    this.modalResetBtn.addEventListener("click", () => {
      this.hideModal();
      this.replayLevel();
    });
    this.modalNextBtn.addEventListener("click", () => {
      this.hideModal();
      this.goToNextLevel();
    });
    this.modalCloseBtn?.addEventListener("click", () => this.hideModal());
    this.modalExportMatchBtn?.addEventListener("click", async () => {
      await this.exportMatchCode();
      if (this.modalExportConfirmEl) {
        this.modalExportConfirmEl.textContent = "Matchkod kopierad! Skicka den till din vän.";
        this.modalExportConfirmEl.hidden = false;
      }
    });

    this.campaignModeBtn.addEventListener("click", () => {
      this.closeMobilePanel();
      this.setHubView("single-player");
    });
    this.challengeModeBtn.addEventListener("click", () => {
      this.closeMobilePanel();
      this.setHubView("multiplayer");
    });
    this.highScoreMenuBtn?.addEventListener("click", () => this.setHubView("high-score"));
    this.achievementMenuBtn?.addEventListener("click", () => this.setHubView("achievement"));
    this.creditsMenuBtn?.addEventListener("click", () => this.setHubView("credit"));
    this.challengeGenerateBtn.addEventListener("click", () => {
      const levelCount = Number(this.matchLevelCountSelect?.value) || 10;
      this.createChallenge(this.challengeSeedInput.value.trim(), levelCount);
      this.closeMobilePanel();
      if (this.state.mode === "challenge") {
        this.loadChallengeLevel(0, { announce: true });
      } else {
        this.renderChallengePanel();
      }
    });
    this.exportMatchBtn?.addEventListener("click", () => this.exportMatchCode());
    this.importMatchBtn?.addEventListener("click", () => this.openMatchImport());
    this.matchAbortBtn?.addEventListener("click", () => this.abortMatch());
    this.matchNewAfterShareBtn?.addEventListener("click", () => this.abortMatch());
    this.matchNewAfterResultsBtn?.addEventListener("click", () => this.abortMatch());
    this.matchImportCancelBtn?.addEventListener("click", () => this.closeMatchImport());
    this.matchImportConfirmBtn?.addEventListener("click", () => this.confirmMatchImport());
    this.matchImportModalEl?.addEventListener("click", (event) => {
      if (event.target === this.matchImportModalEl) {
        this.closeMatchImport();
      }
    });
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

    // Mobile tab bar
    this.mobileTabPlay?.addEventListener("click", () => this.onMobileTab("play"));
    this.mobileTabMenu?.addEventListener("click", () => this.onMobileTab("menu"));
    this.mobileTabStats?.addEventListener("click", () => this.onMobileTab("stats"));
    this.mobilePanelBackdrop?.addEventListener("click", () => this.closeMobilePanel());
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

  createChallenge(seedInput, levelCount = 10) {
    const challenge = createMixedChallenge(CAMPAIGN_LEVELS, seedInput, levelCount);
    this.challenge = {
      seed: challenge.seed,
      levels: challenge.levels,
      cursor: 0,
      resultsByLevelId: {},
    };
    this.challengeRunMeta = {
      runId: createRunId(),
      startedAtMs: Date.now(),
      saved: false,
    };

    // Create match object for this challenge run
    try {
      this.activeMatch = createMatch({
        seed: challenge.seed,
        levels: challenge.levels,
      });
      addPlayerToMatch(this.activeMatch, LOCAL_PLAYER_ID);
    } catch {
      this.activeMatch = null;
    }

    if (this.challengeSeedInput) {
      this.challengeSeedInput.value = challenge.seed;
    }
    this.setMatchPhase("play");
    this.renderChallengePanel();
    this.renderHubPanels();
  }

  renderChallengePanel() {
    if (!this.challengeListEl) {
      return;
    }

    const completedCount = Object.keys(this.challenge.resultsByLevelId).length;
    if (this.matchProgressLabelEl) {
      this.matchProgressLabelEl.textContent =
        `${completedCount} / ${this.challenge.levels.length} banor klara`;
    }

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
      pill.disabled = solved;
      pill.addEventListener("click", () => {
        if (solved) return;
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

  getChallengeActionTotals(splits = []) {
    if (!Array.isArray(splits)) {
      return { undoCount: 0, resetCount: 0, hintCount: 0 };
    }

    return splits.reduce(
      (acc, split) => {
        if (!split?.completed) {
          return acc;
        }
        acc.undoCount += Number(split.undoCount) || 0;
        acc.resetCount += Number(split.resetCount) || 0;
        acc.hintCount += Number(split.hintCount) || 0;
        return acc;
      },
      { undoCount: 0, resetCount: 0, hintCount: 0 },
    );
  }

  buildChallengeSummaryPayload(summary, options = {}) {
    const exportedAtIso = typeof options.exportedAtIso === "string" ? options.exportedAtIso : new Date().toISOString();
    const startedAtIso = new Date(this.challengeRunMeta.startedAtMs).toISOString();
    const isCompleted = summary.totalLevels > 0 && summary.completedCount >= summary.totalLevels;
    const finishedAtIso = typeof options.finishedAtIso === "string"
      ? options.finishedAtIso
      : isCompleted
        ? exportedAtIso
        : null;
    const runId = this.challengeRunMeta.runId || createRunId();
    this.challengeRunMeta.runId = runId;
    const source = options.source || "live-challenge";
    const totals = this.getChallengeActionTotals(summary.splits);
    const completionRate = summary.totalLevels > 0 ? summary.completedCount / summary.totalLevels : 0;
    const normalizedSplits = Array.isArray(summary.splits)
      ? summary.splits.map((split) => ({
          index: Number(split.index) || 0,
          levelId: String(split.levelId ?? ""),
          levelName: String(split.levelName ?? ""),
          difficulty: String(split.difficulty ?? ""),
          par: Number(split.par) || 0,
          completed: Boolean(split.completed),
          timeMs: Number.isFinite(split.timeMs) ? Number(split.timeMs) : null,
          undoCount: Number(split.undoCount) || 0,
          resetCount: Number(split.resetCount) || 0,
          hintCount: Number(split.hintCount) || 0,
          penaltySeconds: Number.isFinite(split.penaltySeconds) ? Number(split.penaltySeconds) : 0,
          score: Number(split.score) || 0,
        }))
      : [];

    return {
      schemaVersion: CHALLENGE_SUMMARY_SCHEMA_VERSION,
      kind: CHALLENGE_SUMMARY_SCHEMA_KIND,
      exportedAt: exportedAtIso,
      game: {
        id: "one-stroke",
        title: "One Stroke",
        levelFormatVersion: LEVEL_FORMAT_VERSION,
      },
      mode: "challenge",
      source,
      run: {
        id: runId,
        seed: summary.seed,
        status: isCompleted ? "completed" : "in-progress",
        startedAt: startedAtIso,
        finishedAt: finishedAtIso,
        completedCount: Number(summary.completedCount) || 0,
        totalLevels: Number(summary.totalLevels) || 0,
        completionRate: Number(completionRate.toFixed(6)),
        matchId: this.activeMatch?.matchId ?? null,
      },
      totals: {
        score: Number(summary.totalScore) || 0,
        timeMs: Number(summary.totalTimeMs) || 0,
        penaltySeconds: Number(summary.totalPenaltySeconds) || 0,
        averageSplitMs: Number.isFinite(summary.averageSplitMs) ? Number(summary.averageSplitMs) : null,
        undoCount: totals.undoCount,
        resetCount: totals.resetCount,
        hintCount: totals.hintCount,
      },
      splits: normalizedSplits,
    };
  }

  buildChallengeSummaryText(payload) {
    const lines = [];
    lines.push(`one_stroke_challenge_summary_v${payload.schemaVersion}`);
    lines.push(`kind\t${payload.kind}`);
    lines.push(`source\t${payload.source}`);
    lines.push(`exported_at\t${payload.exportedAt}`);
    lines.push(`run_id\t${payload.run.id}`);
    lines.push(`seed\t${payload.run.seed}`);
    lines.push(`status\t${payload.run.status}`);
    lines.push(`completed\t${payload.run.completedCount}/${payload.run.totalLevels}`);
    lines.push(`completion_rate\t${toMachineDecimal(payload.run.completionRate, 6)}`);
    lines.push(`completion_rate_percent\t${toMachineDecimal(payload.run.completionRate * 100, 1)}`);
    lines.push(`started_at\t${payload.run.startedAt}`);
    lines.push(`finished_at\t${payload.run.finishedAt ?? "--"}`);
    lines.push(`score\t${payload.totals.score}`);
    lines.push(`time_ms\t${payload.totals.timeMs}`);
    lines.push(`time_display\t${toDisplayTime(payload.totals.timeMs)}`);
    lines.push(`penalty_seconds\t${toMachineDecimal(payload.totals.penaltySeconds, 1)}`);
    lines.push(`average_split_ms\t${payload.totals.averageSplitMs ?? ""}`);
    lines.push(`undo_count\t${payload.totals.undoCount}`);
    lines.push(`reset_count\t${payload.totals.resetCount}`);
    lines.push(`hint_count\t${payload.totals.hintCount}`);
    lines.push("");
    lines.push("splits_tsv");
    lines.push("index\tlevel_id\tlevel_name\tdifficulty\tpar\tcompleted\ttime_ms\tundo\treset\thint\tpenalty_seconds\tscore");
    for (const split of payload.splits) {
      const safeLevelName = String(split.levelName ?? "").replace(/[\t\r\n]+/g, " ").trim();
      lines.push(
        `${split.index}\t${split.levelId}\t${safeLevelName}\t${split.difficulty}\t${split.par}\t${split.completed ? 1 : 0}\t${split.timeMs ?? ""}\t${split.undoCount}\t${split.resetCount}\t${split.hintCount}\t${toMachineDecimal(split.penaltySeconds, 1)}\t${split.score}`,
      );
    }
    return lines.join("\n");
  }

  async copyChallengeSummary() {
    const summary = this.getChallengeSummary();
    const payload = this.buildChallengeSummaryPayload(summary, { source: "clipboard-text" });
    const text = this.buildChallengeSummaryText(payload);

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
      this.setStatus("Challenge-summary (text v1) kopierad till urklipp.");
    } catch {
      this.setStatus("Kunde inte kopiera summary automatiskt.", "loss");
    }
  }

  exportChallengeSummary() {
    const summary = this.getChallengeSummary();
    const payload = this.buildChallengeSummaryPayload(summary, { source: "json-export" });
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeSeed = payload.run.seed.replace(/[^a-z0-9_-]+/gi, "-").replace(/-+/g, "-").slice(0, 40) || "challenge";
    link.href = url;
    link.download = `one-stroke-${safeSeed}-summary-v${payload.schemaVersion}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    this.setStatus("Challenge-summary exporterad som JSON (schema v1).");
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
    if (this.hubView === "multiplayer") {
      this.setMatchPhase(this.matchPhase);
      this.renderMatchPanel();
    }
  }

  renderBoardModeLabel() {
    if (!this.boardModeLabelEl) {
      return;
    }
    const isChallenge = this.state.mode === "challenge";
    this.boardModeLabelEl.textContent = isChallenge
      ? "Multiplayer · Challenge"
      : "Single-player · Kampanj";
    if (this.appShellEl) {
      this.appShellEl.dataset.mode = isChallenge ? "challenge" : "campaign";
    }
    document.body.classList.toggle("mode-challenge", isChallenge);
  }

  setMatchPhase(phase) {
    this.matchPhase = phase;
    const phases = {
      setup: this.matchPhaseSetupEl,
      play: this.matchPhasePlayEl,
      share: this.matchPhaseShareEl,
      results: this.matchPhaseResultsEl,
    };
    for (const [key, el] of Object.entries(phases)) {
      if (el) {
        el.hidden = key !== phase;
      }
    }

    if (phase === "share") {
      this.renderSharePhase();
    }
    if (phase === "results") {
      this.renderMatchStandings();
      this.renderMatchLevelComparison();
      this.renderResultsPhaseStatus();
    }
  }

  renderSharePhase() {
    const summary = this.getChallengeSummary();
    if (this.shareTotalScoreEl) {
      this.shareTotalScoreEl.textContent = toDisplayScore(summary.totalScore);
    }
    if (this.shareTotalTimeEl) {
      this.shareTotalTimeEl.textContent = toDisplayTime(summary.totalTimeMs);
    }
    if (this.shareTotalCompletedEl) {
      this.shareTotalCompletedEl.textContent = `${summary.completedCount} / ${summary.totalLevels}`;
    }
    if (this.matchShareConfirmEl) {
      this.matchShareConfirmEl.hidden = true;
    }
  }

  renderResultsPhaseStatus() {
    if (!this.matchResultStatusEl || !this.activeMatch) {
      return;
    }
    const playerCount = Object.keys(this.activeMatch.players).length;
    const finishedCount = Object.values(this.activeMatch.players).filter((p) => p.status === "finished").length;
    this.matchResultStatusEl.textContent = `${finishedCount} av ${playerCount} spelare klara`;
  }

  abortMatch() {
    this.activeMatch = null;
    this.challenge = {
      seed: todaySeed(),
      levels: [],
      cursor: 0,
      resultsByLevelId: {},
    };
    this.setMatchPhase("setup");
  }

  // ── Mobile panel ──────────────────────────────────────────

  isMobileLayout() {
    return window.matchMedia("(max-width: 760px)").matches;
  }

  onMobileTab(tab) {
    if (!this.isMobileLayout()) return;

    // Update active tab
    this.mobileTabPlay?.classList.toggle("active", tab === "play");
    this.mobileTabMenu?.classList.toggle("active", tab === "menu");
    this.mobileTabStats?.classList.toggle("active", tab === "stats");

    if (tab === "play") {
      this.closeMobilePanel();
      // Restore gameplay view
      const gameView = this.state.mode === "challenge" ? "multiplayer" : "single-player";
      this.setHubView(gameView, { syncMode: false });
      return;
    }

    if (tab === "menu") {
      // Show sidebar with game mode controls
      const gameView = this.state.mode === "challenge" ? "multiplayer" : "single-player";
      this.setHubView(gameView, { syncMode: false });
      this.openMobilePanel();
    } else if (tab === "stats") {
      // Show high-score/achievements in board area
      this.closeMobilePanel();
      this.setHubView("high-score", { syncMode: false });
    }
  }

  openMobilePanel() {
    if (!this.sidebarEl) return;
    this.mobilePanelOpen = true;
    this.sidebarEl.classList.add("mobile-panel-open");
    if (this.mobilePanelBackdrop) {
      this.mobilePanelBackdrop.hidden = false;
      requestAnimationFrame(() => {
        this.mobilePanelBackdrop.classList.add("visible");
      });
    }
  }

  closeMobilePanel() {
    if (!this.sidebarEl) return;
    this.mobilePanelOpen = false;
    this.sidebarEl.classList.remove("mobile-panel-open");
    if (this.mobilePanelBackdrop) {
      this.mobilePanelBackdrop.classList.remove("visible");
      // Hide after transition
      setTimeout(() => {
        if (!this.mobilePanelOpen) {
          this.mobilePanelBackdrop.hidden = true;
        }
      }, 300);
    }
  }

  isCompletedChallengeRun(run) {
    return Number(run?.totalLevels) > 0 && Number(run?.completedCount) >= Number(run?.totalLevels);
  }

  getSortedChallengeRuns(runs) {
    return [...runs].sort((a, b) => {
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
    const completeRuns = runs.filter((run) => this.isCompletedChallengeRun(run));
    const bestChallengeTimeMs = completeRuns.length > 0
      ? Math.min(...completeRuns.map((run) => Number(run.totalTimeMs) || Number.POSITIVE_INFINITY))
      : null;

    this.highScoreBestChallengeScoreEl.textContent = toDisplayScore(bestChallengeScore);
    this.highScoreBestChallengeTimeEl.textContent = bestChallengeTimeMs ? toDisplayTime(bestChallengeTimeMs) : "--";
    this.highScoreCampaignSolvedEl.textContent = `${solvedCount} / ${CAMPAIGN_TOTAL_LEVELS}`;
    this.highScoreRunCountEl.textContent = String(runs.length);
    this.renderCampaignDifficultyStats();
    this.renderChallengeRunStats();

    const sorted = this.getSortedChallengeRuns(runs);
    const visibleRuns = sorted.slice(0, CHALLENGE_HISTORY_LIMIT);

    this.highScoreRunListEl.innerHTML = "";
    if (visibleRuns.length === 0) {
      this.selectedHighScoreRunId = null;
      this.renderHighScoreRunDetail(null, []);
      const empty = document.createElement("p");
      empty.className = "hub-empty";
      empty.textContent = "Ingen challenge-historik ännu. Spela en challenge-run för att fylla listan.";
      this.highScoreRunListEl.append(empty);
      return;
    }

    if (!visibleRuns.some((run) => run.id === this.selectedHighScoreRunId)) {
      this.selectedHighScoreRunId = visibleRuns[0].id;
    }

    visibleRuns.forEach((run, index) => {
      const row = document.createElement("article");
      row.className = "hub-run-row";
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.classList.toggle("active", run.id === this.selectedHighScoreRunId);

      const title = document.createElement("div");
      title.className = "hub-run-title";
      title.textContent = `${index + 1}. Seed ${run.seed || "--"} · ${toDisplayScore(run.totalScore)} p`;

      const meta = document.createElement("div");
      meta.className = "hub-run-meta";
      meta.textContent =
        `${toDisplayTime(run.totalTimeMs)} · ${run.completedCount}/${run.totalLevels} klara · ${toDisplayDateTime(run.finishedAt)}`;

      const selectRun = () => {
        this.selectedHighScoreRunId = run.id;
        this.renderHighScoreView();
      };
      row.addEventListener("click", selectRun);
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectRun();
        }
      });

      row.append(title, meta);
      this.highScoreRunListEl.append(row);
    });

    const selectedRun = visibleRuns.find((run) => run.id === this.selectedHighScoreRunId) ?? visibleRuns[0];
    this.renderHighScoreRunDetail(selectedRun, sorted);
  }

  getRunPersonalBests(runs) {
    const bestScore = runs.reduce((max, run) => Math.max(max, Number(run.totalScore) || 0), 0);
    const completedRuns = runs.filter((run) => this.isCompletedChallengeRun(run));
    const bestTimeMsRaw = completedRuns.reduce(
      (min, run) => Math.min(min, Number(run.totalTimeMs) || Number.POSITIVE_INFINITY),
      Number.POSITIVE_INFINITY,
    );

    return {
      bestScore,
      bestTimeMs: Number.isFinite(bestTimeMsRaw) ? bestTimeMsRaw : null,
    };
  }

  createRunDetailMetricCard(label, value, tone = "neutral") {
    const card = document.createElement("article");
    card.className = "hub-mini-card run-detail-card";

    const cardLabel = document.createElement("span");
    cardLabel.className = "label";
    cardLabel.textContent = label;

    const cardValue = document.createElement("strong");
    cardValue.textContent = value;
    if (tone === "better") {
      cardValue.classList.add("metric-better");
    } else if (tone === "worse") {
      cardValue.classList.add("metric-worse");
    }

    card.append(cardLabel, cardValue);
    return card;
  }

  renderHighScoreRunDetail(selectedRun, runs) {
    if (!this.highScoreRunDetailEl) {
      return;
    }

    this.highScoreRunDetailEl.innerHTML = "";
    if (!selectedRun) {
      const empty = document.createElement("p");
      empty.className = "hub-empty";
      empty.textContent = "Välj en run för att se detaljerad jämförelse mot personligt bästa.";
      this.highScoreRunDetailEl.append(empty);
      return;
    }

    const rank = runs.findIndex((run) => run.id === selectedRun.id) + 1;
    const completedCount = Number(selectedRun.completedCount) || 0;
    const totalLevels = Number(selectedRun.totalLevels) || 0;
    const isComplete = this.isCompletedChallengeRun(selectedRun);
    const score = Number(selectedRun.totalScore) || 0;
    const timeMs = Number(selectedRun.totalTimeMs) || 0;
    const undoCount = Number(selectedRun.undoCount) || 0;
    const resetCount = Number(selectedRun.resetCount) || 0;
    const hintCount = Number(selectedRun.hintCount) || 0;
    const personalBests = this.getRunPersonalBests(runs);
    const scoreDelta = score - personalBests.bestScore;
    const timeDelta = isComplete && Number.isFinite(personalBests.bestTimeMs)
      ? timeMs - personalBests.bestTimeMs
      : null;

    const summary = document.createElement("p");
    summary.className = "run-detail-summary";
    summary.textContent =
      `Run #${rank} · Seed ${selectedRun.seed || "--"} · ${completedCount}/${totalLevels} klara · ${toDisplayDateTime(selectedRun.finishedAt)}`;
    this.highScoreRunDetailEl.append(summary);

    const metricGrid = document.createElement("div");
    metricGrid.className = "hub-mini-grid run-detail-grid";
    metricGrid.append(
      this.createRunDetailMetricCard("Poäng", `${toDisplayScore(score)} p`),
      this.createRunDetailMetricCard(
        "Poäng vs PB",
        toDisplaySignedScoreDelta(scoreDelta),
        scoreDelta === 0 ? "better" : "worse",
      ),
      this.createRunDetailMetricCard("Tid", toDisplayTime(timeMs)),
      this.createRunDetailMetricCard(
        "Tid vs PB",
        isComplete ? toDisplaySignedTimeDelta(timeDelta) : "Kräver full run",
        isComplete && timeDelta === 0 ? "better" : isComplete ? "worse" : "neutral",
      ),
      this.createRunDetailMetricCard("Klara", `${completedCount}/${totalLevels}`),
      this.createRunDetailMetricCard("U / R / H", `U:${undoCount} R:${resetCount} H:${hintCount}`),
    );
    this.highScoreRunDetailEl.append(metricGrid);

    const splitTitle = document.createElement("p");
    splitTitle.className = "run-detail-subtitle";
    splitTitle.textContent = "Splits";
    this.highScoreRunDetailEl.append(splitTitle);

    const splitList = document.createElement("div");
    splitList.className = "challenge-split-list highscore-split-list";

    const splits = Array.isArray(selectedRun.splits)
      ? [...selectedRun.splits].sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0))
      : [];
    if (splits.length === 0) {
      const empty = document.createElement("p");
      empty.className = "hub-empty";
      empty.textContent = "Ingen split-data sparad för den här runen.";
      splitList.append(empty);
    } else {
      splits.forEach((split) => {
        const diff = DIFFICULTY_META[split.difficulty] ?? { shortLabel: "?" };
        const row = document.createElement("article");
        row.className = "split-row";
        row.classList.toggle("done", Boolean(split.completed));

        const title = document.createElement("div");
        title.className = "split-title";
        title.textContent = `${split.index}. ${diff.shortLabel} · ${split.levelName || split.levelId}`;

        const meta = document.createElement("div");
        meta.className = "split-meta";
        if (split.completed) {
          meta.textContent =
            `${toDisplayTime(split.timeMs)} · U:${split.undoCount} R:${split.resetCount} H:${split.hintCount} · ${toDisplayScore(split.score)} p`;
        } else {
          meta.textContent = "Inte klar ännu";
        }

        row.append(title, meta);
        splitList.append(row);
      });
    }

    this.highScoreRunDetailEl.append(splitList);
  }

  getCampaignDifficultyStats() {
    const solvedLevels = this.progress.solvedLevels ?? {};
    const difficultyIds = DIFFICULTY_ORDER.filter((difficultyId) => Boolean(DIFFICULTY_META[difficultyId]));

    return difficultyIds.map((difficultyId) => {
      const levels = CAMPAIGN_LEVELS.filter((level) => level.difficulty === difficultyId);
      const solvedEntries = levels
        .map((level) => solvedLevels[level.id] ?? null)
        .filter(Boolean);
      const solvedCount = solvedEntries.length;
      const totalLevels = levels.length;
      const bestTimeMsRaw = solvedEntries.reduce((min, entry) => {
        const bestTimeMs = Number(entry.bestTimeMs);
        if (!Number.isFinite(bestTimeMs) || bestTimeMs <= 0) {
          return min;
        }
        return Math.min(min, bestTimeMs);
      }, Number.POSITIVE_INFINITY);
      const timeAggregate = solvedEntries.reduce(
        (acc, entry) => {
          const bestTimeMs = Number(entry.bestTimeMs);
          if (!Number.isFinite(bestTimeMs) || bestTimeMs <= 0) {
            return acc;
          }
          return {
            sum: acc.sum + bestTimeMs,
            count: acc.count + 1,
          };
        },
        { sum: 0, count: 0 },
      );

      return {
        difficultyId,
        label: DIFFICULTY_META[difficultyId].label,
        solvedCount,
        totalLevels,
        bestTimeMs: Number.isFinite(bestTimeMsRaw) ? bestTimeMsRaw : null,
        averageTimeMs: timeAggregate.count > 0 ? Math.round(timeAggregate.sum / timeAggregate.count) : null,
        winRate: totalLevels > 0 ? (solvedCount / totalLevels) * 100 : null,
      };
    });
  }

  renderCampaignDifficultyStats() {
    if (!this.highScoreDifficultyBodyEl) {
      return;
    }

    const rows = this.getCampaignDifficultyStats();
    this.highScoreDifficultyBodyEl.innerHTML = "";

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      const difficultyCell = document.createElement("td");
      difficultyCell.textContent = row.label;

      const solvedCell = document.createElement("td");
      solvedCell.textContent = `${row.solvedCount}/${row.totalLevels}`;

      const bestCell = document.createElement("td");
      bestCell.textContent = row.bestTimeMs ? toDisplayTime(row.bestTimeMs) : "--";

      const averageCell = document.createElement("td");
      averageCell.textContent = row.averageTimeMs ? toDisplayTime(row.averageTimeMs) : "--";

      const winRateCell = document.createElement("td");
      winRateCell.textContent = toDisplayPercent(row.winRate);

      tr.append(difficultyCell, solvedCell, bestCell, averageCell, winRateCell);
      this.highScoreDifficultyBodyEl.append(tr);
    });
  }

  getChallengeRunStats() {
    const runs = Array.isArray(this.challengeRunHistory) ? this.challengeRunHistory : [];
    const completedRuns = runs.filter((run) => Number(run.totalLevels) > 0 && Number(run.completedCount) >= Number(run.totalLevels));
    const runCount = runs.length;
    const completedRunCount = completedRuns.length;
    const totalScore = runs.reduce((sum, run) => sum + (Number(run.totalScore) || 0), 0);
    const totalCompletedLevels = runs.reduce((sum, run) => sum + (Number(run.completedCount) || 0), 0);
    const totalLevels = runs.reduce((sum, run) => sum + (Number(run.totalLevels) || 0), 0);
    const totalUndo = runs.reduce((sum, run) => sum + (Number(run.undoCount) || 0), 0);
    const totalHint = runs.reduce((sum, run) => sum + (Number(run.hintCount) || 0), 0);
    const totalCompletedRunTimeMs = completedRuns.reduce((sum, run) => sum + (Number(run.totalTimeMs) || 0), 0);

    return {
      runCount,
      completedRunCount,
      completionRate: runCount > 0 ? (completedRunCount / runCount) * 100 : null,
      averageScore: runCount > 0 ? totalScore / runCount : null,
      averageTimeMs: completedRunCount > 0 ? Math.round(totalCompletedRunTimeMs / completedRunCount) : null,
      averageCompletedLevels: runCount > 0 ? totalCompletedLevels / runCount : null,
      averageTotalLevels: runCount > 0 ? totalLevels / runCount : null,
      averageUndo: runCount > 0 ? totalUndo / runCount : null,
      averageHint: runCount > 0 ? totalHint / runCount : null,
    };
  }

  renderChallengeRunStats() {
    if (
      !this.highScoreRunCompletionRateEl ||
      !this.highScoreRunAverageScoreEl ||
      !this.highScoreRunAverageTimeEl ||
      !this.highScoreRunAverageCompletedEl ||
      !this.highScoreRunAverageUndoEl ||
      !this.highScoreRunAverageHintEl
    ) {
      return;
    }

    const stats = this.getChallengeRunStats();
    this.highScoreRunCompletionRateEl.textContent =
      stats.runCount > 0 ? `${stats.completedRunCount}/${stats.runCount} · ${toDisplayPercent(stats.completionRate)}` : "--";
    this.highScoreRunAverageScoreEl.textContent = stats.runCount > 0 ? `${toDisplayScore(stats.averageScore)} p` : "--";
    this.highScoreRunAverageTimeEl.textContent = stats.averageTimeMs ? toDisplayTime(stats.averageTimeMs) : "--";
    this.highScoreRunAverageCompletedEl.textContent =
      stats.runCount > 0
        ? `${toDisplayDecimal(stats.averageCompletedLevels, 1)} / ${toDisplayDecimal(stats.averageTotalLevels, 1)}`
        : "--";
    this.highScoreRunAverageUndoEl.textContent = stats.runCount > 0 ? toDisplayDecimal(stats.averageUndo, 1) : "--";
    this.highScoreRunAverageHintEl.textContent = stats.runCount > 0 ? toDisplayDecimal(stats.averageHint, 1) : "--";
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
    this.logChallengeEvent({
      type: "level-start",
      levelIndex: clamped + 1,
      levelId: level.id,
      attemptNumber: (this.levelAttempt?.resetCount ?? 0) + 1,
    });
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
    this.hideOpponentDelta();
    this.boardEl.classList.remove("board-lost");
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

    if (this.state.mode === "challenge") {
      this.showReadyOverlay();
    } else {
      this.startLiveTimer();
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

    this.updateLiveStats();
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
    const penaltyText =
      this.state.mode === "challenge" ? ` (-${toDisplayScore(CHALLENGE_HINT_PENALTY)} p)` : " (sparas i statistik)";

    if (hint.type === "next") {
      const isNewHint = this.activeHintKey !== hint.key;
      this.activeHintKey = hint.key;
      if (isNewHint) {
        this.levelAttempt.hintCount += 1;
      }
      this.renderState();
      const [x, y] = parseKey(hint.key);
      this.setStatus(`Hint: prova nod ${x + 1},${y + 1}.${penaltyText}`);
      return;
    }

    if (hint.type === "backtrack") {
      this.activeHintKey = null;
      this.levelAttempt.hintCount += 1;
      this.renderState();
      const stepsBack = hint.stepsBack;
      this.setStatusWithActions(
        `Ingen lösning härifrån. Backa ${stepsBack} steg.${penaltyText}`,
        "loss",
        [{ label: `Backa ${stepsBack} steg`, action: () => this.backtrackMultiple(stepsBack) }],
      );
      return;
    }

    this.activeHintKey = null;
    this.renderState();
    this.flashInvalid("Ingen lösning hittades. Starta om banan.");
  }

  backtrackMultiple(steps) {
    for (let i = 0; i < steps; i += 1) {
      if (this.state.path.length <= 1) {
        break;
      }
      this.levelAttempt.undoCount += 1;
      const removedKey = this.state.path.pop();
      this.state.visited.delete(removedKey);
    }
    this.state.status = "playing";
    this.activeHintKey = null;
    this.hideModal();
    this.boardEl.classList.remove("board-lost");
    this.renderState();
    if (this.state.mode === "challenge") {
      this.renderChallengeResults();
    }
    const remaining = this.state.playableCount - this.state.visited.size;
    this.setStatus(`Backade ${steps} steg. ${remaining} noder kvar.`);
  }

  findHintTarget() {
    // 1. If we're on the stored solution path, suggest the next step
    const fromSolution = this.getSolutionHintTarget();
    if (fromSolution) {
      return { type: "next", key: fromSolution, source: "solution" };
    }

    // 2. Try to solve from current position via DFS
    const solverResult = this.solveFromCurrentPosition();
    if (solverResult) {
      return { type: "next", key: solverResult, source: "solver" };
    }

    // 3. No solution from here — find how far back we need to go
    const stepsBack = this.findBacktrackDepth();
    if (stepsBack > 0) {
      return { type: "backtrack", stepsBack };
    }

    return { type: "dead" };
  }

  solveFromCurrentPosition() {
    const level = this.state.level;
    const blockedSet = this.state.blockedSet;
    const playableCount = this.state.playableCount;
    const visited = new Set(this.state.visited);
    const tailKey = this.getTailKey();

    // DFS to find a complete Hamiltonian path from current state
    const firstStep = this.dfsHamiltonianNextStep(level, blockedSet, playableCount, tailKey, visited);
    return firstStep;
  }

  dfsHamiltonianNextStep(level, blockedSet, playableCount, startKey, visitedSet) {
    // Returns the first step of a valid completion, or null
    const neighbors = getNeighborKeys(level, blockedSet, startKey).filter(
      (key) => !visitedSet.has(key),
    );

    for (const neighbor of neighbors) {
      visitedSet.add(neighbor);
      if (visitedSet.size === playableCount) {
        visitedSet.delete(neighbor);
        return neighbor;
      }
      if (this.dfsHamiltonianComplete(level, blockedSet, playableCount, neighbor, visitedSet)) {
        visitedSet.delete(neighbor);
        return neighbor;
      }
      visitedSet.delete(neighbor);
    }
    return null;
  }

  dfsHamiltonianComplete(level, blockedSet, playableCount, currentKey, visitedSet) {
    if (visitedSet.size === playableCount) {
      return true;
    }

    const neighbors = getNeighborKeys(level, blockedSet, currentKey).filter(
      (key) => !visitedSet.has(key),
    );

    if (neighbors.length === 0) {
      return false;
    }

    // Prune: check connectivity of unvisited nodes
    const unvisitedKeys = [];
    for (const cell of this.cells.keys()) {
      if (!visitedSet.has(cell)) {
        unvisitedKeys.push(cell);
      }
    }
    if (unvisitedKeys.length > 0) {
      const reachable = new Set();
      const queue = [currentKey];
      const allowed = new Set(unvisitedKeys);
      allowed.add(currentKey);
      reachable.add(currentKey);
      while (queue.length > 0) {
        const node = queue.pop();
        for (const nb of getNeighborKeys(level, blockedSet, node)) {
          if (allowed.has(nb) && !reachable.has(nb)) {
            reachable.add(nb);
            queue.push(nb);
          }
        }
      }
      if (reachable.size < allowed.size) {
        return false;
      }
    }

    // Warnsdorff heuristic: try neighbors with fewest onward options first
    const scored = neighbors.map((key) => {
      const onward = getNeighborKeys(level, blockedSet, key).filter(
        (k) => !visitedSet.has(k),
      ).length;
      return { key, onward };
    });
    scored.sort((a, b) => a.onward - b.onward);

    for (const { key } of scored) {
      visitedSet.add(key);
      if (this.dfsHamiltonianComplete(level, blockedSet, playableCount, key, visitedSet)) {
        visitedSet.delete(key);
        return true;
      }
      visitedSet.delete(key);
    }

    return false;
  }

  findBacktrackDepth() {
    const level = this.state.level;
    const blockedSet = this.state.blockedSet;
    const playableCount = this.state.playableCount;
    const pathCopy = [...this.state.path];
    const visitedCopy = new Set(this.state.visited);

    // Try backing up 1, 2, 3... steps until we find a solvable position
    const maxBacktrack = pathCopy.length - 1; // can't remove the start node
    for (let steps = 1; steps <= maxBacktrack; steps += 1) {
      const removedKey = pathCopy.pop();
      visitedCopy.delete(removedKey);
      const tailKey = pathCopy[pathCopy.length - 1];
      const nextStep = this.dfsHamiltonianNextStep(level, blockedSet, playableCount, tailKey, visitedCopy);
      if (nextStep) {
        return steps;
      }
    }
    return 0;
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

    const wasLost = this.state.status === "lost";
    this.levelAttempt.undoCount += 1;
    const removedKey = this.state.path.pop();
    this.state.visited.delete(removedKey);
    this.state.status = "playing";
    this.activeHintKey = null;
    this.hideModal();
    this.boardEl.classList.remove("board-lost");
    if (wasLost) {
      this.startLiveTimer();
    }
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

  replayLevel() {
    const startKey = coordKey(this.state.level.start[0], this.state.level.start[1]);
    this.state.path = [startKey];
    this.state.visited = new Set(this.state.path);
    this.state.status = "playing";
    this.activeHintKey = null;
    this.levelAttempt = {
      startedAtMs: Date.now(),
      undoCount: 0,
      resetCount: 0,
      hintCount: 0,
    };
    this.stopDrag();
    this.hideModal();
    this.boardEl.classList.remove("board-lost");
    this.renderState();
    this.startLiveTimer();
    if (this.state.mode === "challenge") {
      this.renderChallengeResults();
    }
    this.setStatus("Nytt försök. Kör igen.");
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
    this.boardEl.classList.remove("board-lost");
    this.renderState();
    this.startLiveTimer();
    if (this.state.mode === "challenge") {
      this.renderChallengeResults();
    }
    this.setStatus(`Banan återställd. ${this.state.playableCount - 1} noder kvar. Kör igen.`);
  }

  handleWin() {
    this.state.status = "won";
    this.activeHintKey = null;
    this.stopDrag();
    this.stopLiveTimer();
    this.updateLiveStats();

    const durationMs = Date.now() - this.levelAttempt.startedAtMs;
    const result = {
      durationMs,
      undoCount: this.levelAttempt.undoCount,
      resetCount: this.levelAttempt.resetCount,
      hintCount: this.levelAttempt.hintCount,
      completedAt: Date.now(),
    };

    let pbTag = "";
    if (this.state.mode === "campaign") {
      const previous = this.progress.solvedLevels[this.state.level.id];
      if (!previous) {
        pbTag = " · Första klaring!";
      } else if (durationMs < previous.bestTimeMs) {
        pbTag = ` · Nytt PB! (${toDisplayTime(previous.bestTimeMs)} → ${toDisplayTime(durationMs)})`;
      }
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
          ? `Kampanj klarad. ${timingText}${pbTag}. Nästa nivå är upplåst.`
          : `Sista kampanjnivån klarad. ${timingText}${pbTag}.`,
        hasNext,
      );
    } else {
      const solvedCount = Object.keys(this.challenge.resultsByLevelId).length;
      const totalLevels = this.challenge.levels.length;
      const summary = this.getChallengeSummary();
      const currentSplit = summary.splits.find((split) => split.levelId === this.state.level.id);
      const splitScore = currentSplit?.score ?? 0;

      // Show opponent time comparison on the board
      this.showOpponentDelta(durationMs, this.state.level.id);

      // Build split data for the modal table
      const modalSplits = this.challenge.levels.map((level, i) => {
        const res = this.challenge.resultsByLevelId[level.id];
        const split = summary.splits.find((s) => s.levelId === level.id);
        const opponent = this.getOpponentResultForLevel(level.id);
        return {
          index: i + 1,
          timeMs: res?.durationMs ?? null,
          score: split?.score ?? null,
          opponentTimeMs: opponent?.durationMs ?? null,
          current: level.id === this.state.level.id,
        };
      });

      if (hasNext) {
        const opponent = this.getOpponentResultForLevel(this.state.level.id);
        let deltaText = "";
        if (opponent) {
          const diffMs = durationMs - opponent.durationMs;
          const sign = diffMs > 0 ? "+" : "−";
          const sec = (Math.abs(diffMs) / 1000).toFixed(1);
          deltaText = Math.abs(diffMs) < 100 ? " · Lika!" : ` · ${sign}${sec}s`;
        }
        this.showModal(
          `Bana ${this.challenge.cursor + 1}/${totalLevels} klarad. ${timingText}. Split ${toDisplayScore(splitScore)} p${deltaText}`,
          true,
          { splits: modalSplits },
        );
      } else {
        this.showModal(
          `Match klar! ${solvedCount}/${totalLevels} banor · ${toDisplayScore(summary.totalScore)} p · ${toDisplayTime(summary.totalTimeMs)}`,
          false,
          { title: "Match klar!", splits: modalSplits },
        );
        // Transition to share phase
        this.setMatchPhase("share");
      }
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

    const summary = this.getChallengeSummary();
    const split = summary.splits.find((s) => s.levelId === level.id);
    this.logChallengeEvent({
      type: "level-finish",
      levelIndex: this.challenge.cursor + 1,
      levelId: level.id,
      durationMs: result.durationMs,
      undoCount: result.undoCount,
      resetCount: result.resetCount,
      hintCount: result.hintCount,
      moveCount: this.state.level.par,
      score: split?.score ?? 0,
      firstAttempt: result.resetCount === 0,
    });

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

  logChallengeEvent(event) {
    if (!this.activeMatch) {
      return;
    }
    try {
      const entry = logMatchEvent(this.activeMatch, LOCAL_PLAYER_ID, event);
      console.log(`[match] ${event.type}`, entry);
    } catch {
      // Match logging is best-effort; don't break gameplay.
    }
  }

  archiveCompletedChallengeRun() {
    const summary = this.getChallengeSummary();
    if (summary.completedCount === 0) {
      return;
    }

    const totals = this.getChallengeActionTotals(summary.splits);
    const runId = this.challengeRunMeta.runId || createRunId();

    // Run plausibility check before archiving
    const plausibility = checkRunResult({
      totalTimeMs: summary.totalTimeMs,
      completedCount: summary.completedCount,
      totalLevels: summary.totalLevels,
      splits: summary.splits,
    });
    console.log("[match] plausibility check:", plausibility);
    if (this.activeMatch) {
      console.log("[match] final match object:", serializeMatch(this.activeMatch));
      console.log("[match] standings:", getMatchStandings(this.activeMatch));
    }

    const entry = {
      id: runId,
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
      plausible: plausibility.ok,
      matchId: this.activeMatch?.matchId ?? null,
    };

    this.challengeRunHistory = [entry, ...this.challengeRunHistory].slice(0, CHALLENGE_HISTORY_LIMIT);
    saveChallengeRunHistory(this.challengeRunHistory, CHALLENGE_HISTORY_LIMIT);
    this.challengeRunMeta.runId = runId;
    this.challengeRunMeta.saved = true;
    this.renderHubPanels();
  }

  handleLoss(reason) {
    this.state.status = "lost";
    this.stopDrag();
    this.stopLiveTimer();
    this.updateLiveStats();
    this.renderState();
    this.flashInvalidBoard();
    this.boardEl.classList.add("board-lost");
    const visited = this.state.visited.size;
    const total = this.state.playableCount;
    const pct = Math.round((visited / total) * 100);
    const progress = `${visited}/${total} noder (${pct}%)`;
    this.setStatusWithActions(`Fastlåst: ${reason} Täckt ${progress}.`, "loss", [
      { label: "Ångra (Z)", action: () => this.undo() },
      { label: "Starta om (R)", action: () => this.resetLevel() },
      { label: "Hint (H)", action: () => { this.undo(); this.requestHint(); } },
    ]);
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

  setStatusWithActions(message, tone, actions) {
    this.statusBoxEl.textContent = "";
    this.statusBoxEl.classList.remove("status-win", "status-loss");
    if (tone === "loss") {
      this.statusBoxEl.classList.add("status-loss");
    } else if (tone === "win") {
      this.statusBoxEl.classList.add("status-win");
    }

    const textNode = document.createElement("span");
    textNode.textContent = message;
    this.statusBoxEl.append(textNode);

    const btnRow = document.createElement("span");
    btnRow.className = "status-actions";
    for (const { label, action } of actions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "status-action-btn";
      btn.textContent = label;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        action();
      });
      btnRow.append(btn);
    }
    this.statusBoxEl.append(btnRow);
  }

  showModal(text, showNext, options = {}) {
    const { showMatchExport = false, title = "Bana klar", splits = null } = options;
    this.winModalEl.querySelector("#winTitle").textContent = title;
    this.winTextEl.textContent = text;
    this.modalNextBtn.hidden = !showNext;
    // Hide "Spela om" in challenge mode — no replays allowed
    this.modalResetBtn.hidden = this.state.mode === "challenge";
    if (this.modalExportMatchBtn) {
      this.modalExportMatchBtn.hidden = !showMatchExport;
    }
    if (this.modalExportConfirmEl) {
      this.modalExportConfirmEl.hidden = true;
      this.modalExportConfirmEl.textContent = "";
    }
    this.renderWinSplitTable(splits);
    this.winModalEl.classList.remove("hidden");
  }

  renderWinSplitTable(splits) {
    if (!this.winSplitTableEl) {
      return;
    }
    if (!splits || splits.length === 0) {
      this.winSplitTableEl.hidden = true;
      this.winSplitTableEl.innerHTML = "";
      return;
    }

    const hasOpponent = splits.some((s) => s.opponentTimeMs != null);

    this.winSplitTableEl.innerHTML = "";
    const table = document.createElement("table");
    table.className = "win-splits";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    const headers = hasOpponent
      ? ["#", "Du", "Poäng", "Motst.", "Diff"]
      : ["#", "Tid", "Poäng"];
    for (const label of headers) {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.append(th);
    }
    thead.append(headRow);
    table.append(thead);

    const tbody = document.createElement("tbody");
    let runningScore = 0;
    let runningOpponentTime = 0;
    let runningMyTime = 0;

    for (const split of splits) {
      const tr = document.createElement("tr");
      if (split.current) {
        tr.classList.add("win-split-current");
      }

      const tdIndex = document.createElement("td");
      tdIndex.textContent = split.index;
      tdIndex.className = "win-split-index";

      const tdTime = document.createElement("td");
      tdTime.textContent = split.timeMs != null ? toDisplayTime(split.timeMs) : "—";
      if (split.timeMs != null) runningMyTime += split.timeMs;

      const tdScore = document.createElement("td");
      runningScore += split.score || 0;
      tdScore.textContent = split.score != null ? toDisplayScore(split.score) : "—";

      tr.append(tdIndex, tdTime, tdScore);

      if (hasOpponent) {
        const tdOpponent = document.createElement("td");
        tdOpponent.className = "win-split-opponent";
        tdOpponent.textContent = split.opponentTimeMs != null ? toDisplayTime(split.opponentTimeMs) : "—";
        if (split.opponentTimeMs != null) runningOpponentTime += split.opponentTimeMs;

        const tdDiff = document.createElement("td");
        tdDiff.className = "win-split-vs";
        if (split.opponentTimeMs != null && split.timeMs != null) {
          const diffMs = split.timeMs - split.opponentTimeMs;
          if (Math.abs(diffMs) < 100) {
            tdDiff.textContent = "Lika";
            tdDiff.classList.add("win-split-tied");
          } else {
            const sign = diffMs > 0 ? "+" : "−";
            const sec = (Math.abs(diffMs) / 1000).toFixed(1);
            tdDiff.textContent = `${sign}${sec}s`;
            tdDiff.classList.add(diffMs > 0 ? "win-split-behind" : "win-split-ahead");
          }
        } else {
          tdDiff.textContent = "—";
        }

        tr.append(tdOpponent, tdDiff);
      }

      tbody.append(tr);
    }
    table.append(tbody);

    // Total row
    const summary = this.getChallengeSummary();
    const tfoot = document.createElement("tfoot");
    const totalRow = document.createElement("tr");
    totalRow.className = "win-split-total";

    const tdLabel = document.createElement("td");
    tdLabel.textContent = "Σ";
    const tdTotalTime = document.createElement("td");
    tdTotalTime.textContent = toDisplayTime(summary.totalTimeMs);
    const tdTotalScore = document.createElement("td");
    tdTotalScore.textContent = toDisplayScore(runningScore);
    totalRow.append(tdLabel, tdTotalTime, tdTotalScore);

    if (hasOpponent) {
      const tdOpponentTotal = document.createElement("td");
      tdOpponentTotal.textContent = runningOpponentTime > 0 ? toDisplayTime(runningOpponentTime) : "—";
      const tdDiffTotal = document.createElement("td");
      tdDiffTotal.className = "win-split-vs";
      if (runningMyTime > 0 && runningOpponentTime > 0) {
        const totalDiff = runningMyTime - runningOpponentTime;
        if (Math.abs(totalDiff) < 100) {
          tdDiffTotal.textContent = "Lika";
          tdDiffTotal.classList.add("win-split-tied");
        } else {
          const sign = totalDiff > 0 ? "+" : "−";
          const sec = (Math.abs(totalDiff) / 1000).toFixed(1);
          tdDiffTotal.textContent = `${sign}${sec}s`;
          tdDiffTotal.classList.add(totalDiff > 0 ? "win-split-behind" : "win-split-ahead");
        }
      }
      totalRow.append(tdOpponentTotal, tdDiffTotal);
    }

    tfoot.append(totalRow);
    table.append(tfoot);

    this.winSplitTableEl.append(table);
    this.winSplitTableEl.hidden = false;
  }

  // ── Match (1v1) methods ──────────────────────────────────

  async exportMatchCode() {
    if (!this.activeMatch) {
      this.setStatus("Skapa en challenge först.", "loss");
      return;
    }

    const code = encodeMatchCode(this.activeMatch);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.append(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      if (this.matchShareConfirmEl) {
        this.matchShareConfirmEl.textContent = "Kopierad! Skicka koden till din vän.";
        this.matchShareConfirmEl.hidden = false;
      }
      this.setStatus("Matchkod kopierad!");
    } catch {
      this.setStatus("Kunde inte kopiera matchkoden.", "loss");
    }
  }

  openMatchImport() {
    if (!this.matchImportModalEl) {
      return;
    }
    if (this.matchImportTextarea) {
      this.matchImportTextarea.value = "";
    }
    this.clearMatchImportError();
    this.matchImportModalEl.classList.remove("hidden");
    window.requestAnimationFrame(() => {
      this.matchImportTextarea?.focus();
    });
  }

  closeMatchImport() {
    this.matchImportModalEl?.classList.add("hidden");
  }

  setMatchImportError(message) {
    if (!this.matchImportTextarea) {
      return;
    }
    // Show error visually near the textarea
    let errorEl = this.matchImportModalEl?.querySelector(".match-import-error");
    if (!errorEl) {
      errorEl = document.createElement("p");
      errorEl.className = "match-import-error";
      this.matchImportTextarea.parentNode.insertBefore(errorEl, this.matchImportTextarea.nextSibling);
    }
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  clearMatchImportError() {
    const errorEl = this.matchImportModalEl?.querySelector(".match-import-error");
    if (errorEl) {
      errorEl.hidden = true;
    }
  }

  confirmMatchImport() {
    this.clearMatchImportError();

    const raw = this.matchImportTextarea?.value?.trim();
    if (!raw) {
      this.setMatchImportError("Klistra in en matchkod först.");
      return;
    }

    // Decode both compact (OS1:...) and legacy JSON formats
    let matchData;
    const decoded = decodeMatchCode(raw);
    if (!decoded.ok) {
      this.setMatchImportError(decoded.reason);
      return;
    }
    matchData = decoded.data;

    // Validate if it was raw JSON
    if (decoded.format === "json") {
      const validation = validateMatchStructure(matchData);
      if (!validation.ok) {
        this.setMatchImportError(`Ogiltig matchkod: ${validation.reason}`);
        return;
      }
    }

    // Recreate the challenge from the match's seed and level list
    const matchLevelIds = matchData.levels.map((l) => l.levelId);
    const matchLevels = matchLevelIds
      .map((id) => CAMPAIGN_LEVELS.find((l) => l.id === id))
      .filter(Boolean);

    if (matchLevels.length !== matchData.levels.length) {
      this.setMatchImportError(
        `Matchkoden innehåller ${matchData.levels.length} nivåer men ${matchData.levels.length - matchLevels.length} saknas i din kampanjdata.`,
      );
      return;
    }

    // Rename the opponent's "local-player" so we can join as ourselves
    if (matchData.players[LOCAL_PLAYER_ID]) {
      const opponentData = matchData.players[LOCAL_PLAYER_ID];
      const opponentName = `spelare-${matchData.matchId.slice(-6)}`;
      opponentData.playerId = opponentName;
      delete matchData.players[LOCAL_PLAYER_ID];
      matchData.players[opponentName] = opponentData;
    }

    // Use the imported match object and add ourselves as a player
    this.activeMatch = matchData;
    try {
      addPlayerToMatch(this.activeMatch, LOCAL_PLAYER_ID);
    } catch {
      // Already in match or expired — continue anyway for local play.
    }

    if (this.challengeSeedInput) {
      this.challengeSeedInput.value = matchData.seed;
    }

    // Check if this is a completed match (view-only) or one to play
    const localPlayer = this.activeMatch.players[LOCAL_PLAYER_ID];
    const isViewOnly = localPlayer?.status === "finished";

    if (isViewOnly) {
      this.closeMatchImport();
      this.setHubView("multiplayer");
      this.setMatchPhase("results");
      this.renderMatchPanel();
      this.setStatus("Match importerad — resultatjämförelse visas.");
      return;
    }

    // Set up the challenge with the exact same levels
    this.challenge = {
      seed: matchData.seed,
      levels: matchLevels,
      cursor: 0,
      resultsByLevelId: {},
    };
    this.challengeRunMeta = {
      runId: createRunId(),
      startedAtMs: Date.now(),
      saved: false,
    };

    this.closeMatchImport();
    this.setHubView("multiplayer");
    this.setMatchPhase("play");
    this.loadChallengeLevel(0, { announce: true });
    this.renderMatchPanel();

    const opponentNames = Object.keys(this.activeMatch.players)
      .filter((id) => id !== LOCAL_PLAYER_ID)
      .map((id) => id)
      .join(", ");
    const opponentInfo = opponentNames ? ` mot ${opponentNames}` : "";
    this.setStatus(`Match startad${opponentInfo}! Spela alla ${matchData.levelCount} banor.`);
  }

  renderMatchPanel() {
    if (!this.activeMatch) {
      return;
    }

    // Update progress label in play phase
    if (this.matchProgressLabelEl) {
      const completedCount = Object.keys(this.challenge.resultsByLevelId).length;
      const totalLevels = this.challenge.levels.length;
      this.matchProgressLabelEl.textContent = `${completedCount} / ${totalLevels} banor klara`;
    }

    // If there are opponents, show results phase standings
    const playerCount = Object.keys(this.activeMatch.players).length;
    if (playerCount > 1 && this.matchPhase === "results") {
      this.renderMatchStandings();
      this.renderMatchLevelComparison();
    }
  }

  renderMatchStandings() {
    if (!this.matchStandingsListEl) {
      return;
    }

    const standings = getMatchStandings(this.activeMatch);
    this.matchStandingsListEl.innerHTML = "";

    for (const entry of standings) {
      const row = document.createElement("article");
      row.className = "match-standing-row";
      const isYou = entry.playerId === LOCAL_PLAYER_ID;
      if (isYou) {
        row.classList.add("is-you");
      }

      const rank = document.createElement("span");
      rank.className = "match-standing-rank";
      rank.textContent = `#${entry.rank}`;

      const info = document.createElement("div");
      info.className = "match-standing-info";

      const name = document.createElement("div");
      name.className = "match-standing-name";
      name.textContent = isYou ? "Du" : entry.playerId;

      const details = document.createElement("div");
      details.className = "match-standing-details";
      details.textContent =
        `${toDisplayTime(entry.totalTimeMs)} · ${entry.completedCount}/${this.activeMatch.levelCount} klara · U:${entry.totalUndoCount} R:${entry.totalResetCount} H:${entry.totalHintCount}`;

      info.append(name, details);

      const score = document.createElement("span");
      score.className = "match-standing-score";
      score.textContent = `${toDisplayScore(entry.totalScore)} p`;

      row.append(rank, info, score);
      this.matchStandingsListEl.append(row);
    }
  }

  renderMatchLevelComparison() {
    if (!this.matchLevelComparisonEl) {
      return;
    }

    this.matchLevelComparisonEl.innerHTML = "";

    for (const levelMeta of this.activeMatch.levels) {
      const comparison = getLevelComparison(this.activeMatch, levelMeta.index);
      if (comparison.length < 2) {
        continue;
      }

      const row = document.createElement("article");
      row.className = "match-level-row";

      const header = document.createElement("div");
      header.className = "match-level-header";
      const diff = DIFFICULTY_META[levelMeta.difficulty];
      header.textContent = `${levelMeta.index}. ${diff?.shortLabel ?? "?"} · ${levelMeta.levelName}`;

      const playersDiv = document.createElement("div");
      playersDiv.className = "match-level-players";

      const bestScore = Math.max(...comparison.map((c) => c.score || 0));

      for (const result of comparison) {
        const entry = document.createElement("div");
        entry.className = "match-level-entry";
        const isYou = result.playerId === LOCAL_PLAYER_ID;
        const displayName = isYou ? "Du" : result.playerId;

        if (result.durationMs !== null) {
          const isWinner = result.score === bestScore && bestScore > 0;
          if (isWinner) {
            entry.classList.add("match-level-winner");
          }

          const nameSpan = document.createElement("span");
          nameSpan.className = "match-entry-name";
          nameSpan.textContent = displayName;

          const statsSpan = document.createElement("span");
          statsSpan.className = "match-entry-stats";
          statsSpan.textContent =
            `${toDisplayTime(result.durationMs)} · ${toDisplayScore(result.score)} p · U:${result.undoCount} H:${result.hintCount}`;

          entry.append(nameSpan, statsSpan);
        } else {
          entry.textContent = `${displayName}: Inte spelat ännu`;
          entry.classList.add("match-level-pending");
        }
        playersDiv.append(entry);
      }

      row.append(header, playersDiv);
      this.matchLevelComparisonEl.append(row);
    }
  }

  showReadyOverlay() {
    this.state.status = "waiting";
    if (!this.countdownOverlayEl) {
      // No overlay — start immediately
      this.startLiveTimer();
      return;
    }
    if (this.readyBtn) {
      this.readyBtn.hidden = false;
    }
    if (this.countdownNumberEl) {
      this.countdownNumberEl.hidden = true;
    }
    this.countdownOverlayEl.hidden = false;
  }

  onReadyClick() {
    if (this.readyBtn) {
      this.readyBtn.hidden = true;
    }
    if (this.countdownNumberEl) {
      this.countdownNumberEl.hidden = false;
    }
    this.state.status = "countdown";
    this.runCountdown(() => {
      this.state.status = "playing";
      this.levelAttempt.startedAtMs = Date.now();
      this.startLiveTimer();
      this.setStatus(`Kör! ${this.state.playableCount - 1} noder kvar.`);
    });
  }

  runCountdown(onComplete) {
    this.cancelCountdown();
    if (!this.countdownOverlayEl || !this.countdownNumberEl) {
      onComplete();
      return;
    }

    const steps = ["3", "2", "1", "GO!"];
    let index = 0;

    const showStep = () => {
      if (index >= steps.length) {
        this.countdownOverlayEl.hidden = true;
        onComplete();
        return;
      }

      const text = steps[index];
      this.countdownNumberEl.textContent = text;
      this.countdownNumberEl.classList.toggle("go", text === "GO!");
      this.countdownNumberEl.style.animation = "none";
      void this.countdownNumberEl.offsetWidth;
      this.countdownNumberEl.style.animation = "";

      index += 1;
      const delay = text === "GO!" ? 400 : 700;
      this.countdownTimer = window.setTimeout(showStep, delay);
    };

    showStep();
  }

  cancelCountdown() {
    if (this.countdownTimer) {
      window.clearTimeout(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.countdownOverlayEl) {
      this.countdownOverlayEl.hidden = true;
    }
  }

  getOpponentResultForLevel(levelId) {
    if (!this.activeMatch) {
      return null;
    }
    for (const player of Object.values(this.activeMatch.players)) {
      if (player.playerId === LOCAL_PLAYER_ID) {
        continue;
      }
      const finish = player.events.find(
        (e) => e.type === "level-finish" && e.levelId === levelId,
      );
      if (finish) {
        return { playerId: player.playerId, durationMs: finish.durationMs, score: finish.score };
      }
    }
    return null;
  }

  showOpponentDelta(myDurationMs, levelId) {
    const opponent = this.getOpponentResultForLevel(levelId);
    if (!opponent || !this.opponentDeltaEl) {
      return;
    }

    const diffMs = myDurationMs - opponent.durationMs;
    const absDiff = Math.abs(diffMs);
    const sign = diffMs > 0 ? "+" : "-";
    const seconds = (absDiff / 1000).toFixed(1);
    const displayName = opponent.playerId === LOCAL_PLAYER_ID ? "motståndare" : opponent.playerId;

    this.opponentDeltaEl.classList.remove("ahead", "behind", "tied");

    if (Math.abs(diffMs) < 100) {
      this.opponentDeltaEl.textContent = `Lika mot ${displayName}!`;
      this.opponentDeltaEl.classList.add("tied");
    } else if (diffMs < 0) {
      this.opponentDeltaEl.textContent = `${sign}${seconds}s mot ${displayName}`;
      this.opponentDeltaEl.classList.add("ahead");
    } else {
      this.opponentDeltaEl.textContent = `${sign}${seconds}s mot ${displayName}`;
      this.opponentDeltaEl.classList.add("behind");
    }

    // Re-trigger animation
    this.opponentDeltaEl.style.animation = "none";
    void this.opponentDeltaEl.offsetWidth;
    this.opponentDeltaEl.style.animation = "";
    this.opponentDeltaEl.hidden = false;
  }

  hideOpponentDelta() {
    if (this.opponentDeltaEl) {
      this.opponentDeltaEl.hidden = true;
    }
  }

  startLiveTimer() {
    this.stopLiveTimer();
    this.updateLiveStats();
    this.liveTimerInterval = window.setInterval(() => this.updateLiveStats(), 250);
  }

  stopLiveTimer() {
    if (this.liveTimerInterval) {
      window.clearInterval(this.liveTimerInterval);
      this.liveTimerInterval = null;
    }
  }

  updateLiveStats() {
    if (this.liveTimerEl) {
      const elapsed = Date.now() - this.levelAttempt.startedAtMs;
      this.liveTimerEl.textContent = toDisplayTime(elapsed);
    }
    if (this.liveMovesEl) {
      const moves = Math.max(0, this.state.path.length - 1);
      this.liveMovesEl.textContent = `${moves} drag`;
    }
  }

  hideModal() {
    this.winModalEl.classList.add("hidden");
    this.cancelCountdown();
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
      this.setMatchPhase("share");
      this.setStatus("Match klar! Dela matchkoden med din vän.", "win");
      return;
    }
    this.loadChallengeLevel(nextChallengeIndex, { announce: true });
  }
}
